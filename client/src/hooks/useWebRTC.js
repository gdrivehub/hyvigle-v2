/**
 * useWebRTC — Manages RTCPeerConnection, media streams, and signaling
 */
import { useRef, useCallback, useState } from "react";

// STUN servers (Google + Cloudflare)
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

export function useWebRTC({ emit, localVideoRef, remoteVideoRef }) {
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const [mediaState, setMediaState] = useState({
    videoEnabled: true,
    audioEnabled: true,
  });

  // ── Get local media ───────────────────────────────────────────────────────
  const getLocalStream = useCallback(async (mode = "video") => {
    // Stop any existing stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    const constraints =
      mode === "audio"
        ? { audio: true, video: false }
        : { audio: true, video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" } };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setMediaState({
        videoEnabled: mode !== "audio",
        audioEnabled: true,
      });
      return stream;
    } catch (err) {
      console.error("[media] getUserMedia failed:", err);
      throw err;
    }
  }, [localVideoRef]);

  // ── Create peer connection ────────────────────────────────────────────────
  const createPeerConnection = useCallback(() => {
    // Cleanup old
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    // Add local tracks
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    // Handle remote stream
    const remoteStream = new MediaStream();
    pc.ontrack = (e) => {
      e.streams[0]?.getTracks().forEach((track) => remoteStream.addTrack(track));
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    };

    // ICE candidate relay
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        emit("iceCandidate", { candidate: e.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("[webrtc] connectionState:", pc.connectionState);
    };

    return pc;
  }, [emit, remoteVideoRef]);

  // ── Initiate offer (initiator side) ──────────────────────────────────────
  const startCall = useCallback(async () => {
    const pc = createPeerConnection();
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      emit("offer", { offer });
    } catch (err) {
      console.error("[webrtc] createOffer failed:", err);
    }
  }, [createPeerConnection, emit]);

  // ── Handle incoming offer (receiver side) ─────────────────────────────────
  const handleOffer = useCallback(async ({ offer }) => {
    const pc = createPeerConnection();
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      emit("answer", { answer });
    } catch (err) {
      console.error("[webrtc] handleOffer failed:", err);
    }
  }, [createPeerConnection, emit]);

  // ── Handle answer ─────────────────────────────────────────────────────────
  const handleAnswer = useCallback(async ({ answer }) => {
    const pc = pcRef.current;
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error("[webrtc] handleAnswer failed:", err);
    }
  }, []);

  // ── Handle ICE candidate ──────────────────────────────────────────────────
  const handleIceCandidate = useCallback(async ({ candidate }) => {
    const pc = pcRef.current;
    if (!pc || !candidate) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("[webrtc] addIceCandidate failed:", err);
    }
  }, []);

  // ── Close connection ──────────────────────────────────────────────────────
  const closeConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, [remoteVideoRef]);

  // ── Stop local media ──────────────────────────────────────────────────────
  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, [localVideoRef]);

  // ── Toggle video ──────────────────────────────────────────────────────────
  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const vTrack = stream.getVideoTracks()[0];
    if (!vTrack) return;
    vTrack.enabled = !vTrack.enabled;
    setMediaState((s) => ({ ...s, videoEnabled: vTrack.enabled }));
  }, []);

  // ── Toggle audio ──────────────────────────────────────────────────────────
  const toggleAudio = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const aTrack = stream.getAudioTracks()[0];
    if (!aTrack) return;
    aTrack.enabled = !aTrack.enabled;
    setMediaState((s) => ({ ...s, audioEnabled: aTrack.enabled }));
  }, []);

  return {
    getLocalStream,
    startCall,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    closeConnection,
    stopLocalStream,
    toggleVideo,
    toggleAudio,
    mediaState,
    localStreamRef,
    pcRef,
  };
}
