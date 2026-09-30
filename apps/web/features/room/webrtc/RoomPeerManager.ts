export type RtcSignal = {
  from_id: string;
  target_id?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

export class RoomPeerManager {
  private peers = new Map<string, RTCPeerConnection>();
  private pendingCandidates = new Map<string, RTCIceCandidateInit[]>();
  private localStream: MediaStream | null = null;

  constructor(
    private localId: string,
    private iceServers: RTCIceServer[],
    private send: (type: string, payload: Record<string, unknown>) => void,
    private onRemoteStream: (participantId: string, stream: MediaStream) => void
  ) {}

  async connectTo(participantId: string, initiator: boolean): Promise<void> {
    if (participantId === this.localId || this.peers.has(participantId)) return;
    const peer = new RTCPeerConnection({ iceServers: this.iceServers });
    this.peers.set(participantId, peer);

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        this.send('rtc.ice', { target_id: participantId, candidate: event.candidate.toJSON() });
      }
    };
    peer.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      this.onRemoteStream(participantId, stream);
    };
    peer.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(peer.connectionState)) {
        this.remove(participantId);
      }
    };

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        peer.addTrack(track, this.localStream);
      }
    }

    if (initiator) {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      this.send('rtc.offer', { target_id: participantId, sdp: offer });
    }
  }

  async addLocalStream(stream: MediaStream): Promise<void> {
    this.localStream = stream;
    for (const [participantId, peer] of this.peers.entries()) {
      let addedTrack = false;
      for (const track of stream.getTracks()) {
        if (!peer.getSenders().some((sender) => sender.track?.kind === track.kind)) {
          peer.addTrack(track, stream);
          addedTrack = true;
        }
      }
      if (addedTrack) {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        this.send('rtc.offer', { target_id: participantId, sdp: offer });
      }
    }
  }

  async handleSignal(signal: RtcSignal): Promise<void> {
    if (signal.from_id === this.localId) return;
    if (signal.sdp?.type === 'offer') {
      await this.connectTo(signal.from_id, false);
      const peer = this.peers.get(signal.from_id);
      if (!peer) return;
      await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      await this.flushPendingCandidates(signal.from_id, peer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      this.send('rtc.answer', { target_id: signal.from_id, sdp: answer });
    } else if (signal.sdp?.type === 'answer') {
      const peer = this.peers.get(signal.from_id);
      if (peer) {
        await peer.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        await this.flushPendingCandidates(signal.from_id, peer);
      }
    } else if (signal.candidate) {
      const peer = this.peers.get(signal.from_id);
      if (peer && peer.remoteDescription && peer.remoteDescription.type) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch (err) {
          console.warn('Failed to add ICE candidate:', err);
        }
      } else {
        const queue = this.pendingCandidates.get(signal.from_id) || [];
        queue.push(signal.candidate);
        this.pendingCandidates.set(signal.from_id, queue);
      }
    }
  }

  private async flushPendingCandidates(participantId: string, peer: RTCPeerConnection): Promise<void> {
    const queue = this.pendingCandidates.get(participantId);
    if (!queue || queue.length === 0) return;
    for (const candidate of queue) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn('Failed to add queued ICE candidate:', err);
      }
    }
    this.pendingCandidates.delete(participantId);
  }

  async replaceVideoTrack(track: MediaStreamTrack): Promise<void> {
    for (const [participantId, peer] of this.peers.entries()) {
      const sender = peer.getSenders().find((candidate) => candidate.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(track);
        continue;
      }
      peer.addTrack(track, new MediaStream([track]));
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      this.send('rtc.offer', { target_id: participantId, sdp: offer });
    }
  }

  remove(participantId: string): void {
    this.peers.get(participantId)?.close();
    this.peers.delete(participantId);
    this.pendingCandidates.delete(participantId);
  }

  close(): void {
    for (const participantId of this.peers.keys()) this.remove(participantId);
  }
}