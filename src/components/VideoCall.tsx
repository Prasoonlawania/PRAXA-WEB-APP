import React, { useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Video, VideoOff, Mic, MicOff, PhoneOff } from "lucide-react";

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

interface VideoCallProps {
  chatId: string;
  isInitiator: boolean;
  onEndCall: () => void;
}

export function VideoCall({ chatId, isInitiator, onEndCall }: VideoCallProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const pc = useRef<RTCPeerConnection | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);

        const remote = new MediaStream();
        setRemoteStream(remote);

        pc.current = new RTCPeerConnection(servers);

        stream.getTracks().forEach((track) => {
          pc.current?.addTrack(track, stream);
        });

        pc.current.ontrack = (event) => {
          event.streams[0].getTracks().forEach((track) => {
            remote.addTrack(track);
          });
        };

        const callDoc = doc(db, `chats/${chatId}/calls/active`);
        const offerCandidates = collection(callDoc, "offerCandidates");
        const answerCandidates = collection(callDoc, "answerCandidates");

        pc.current.onicecandidate = (event) => {
          if (event.candidate) {
            addDoc(
              isInitiator ? offerCandidates : answerCandidates,
              event.candidate.toJSON(),
            );
          }
        };

        if (isInitiator) {
          const offerDescription = await pc.current.createOffer();
          await pc.current.setLocalDescription(offerDescription);

          await setDoc(callDoc, {
            offer: { type: offerDescription.type, sdp: offerDescription.sdp },
            isActive: true,
          });

          const unsubCall = onSnapshot(callDoc, (snapshot) => {
            const data = snapshot.data();
            if (!pc.current?.currentRemoteDescription && data?.answer) {
              const answerDescription = new RTCSessionDescription(data.answer);
              pc.current?.setRemoteDescription(answerDescription);
            }
          });
          unsubs.push(unsubCall);

          const unsubAnsIce = onSnapshot(answerCandidates, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === "added") {
                const candidate = new RTCIceCandidate(change.doc.data());
                pc.current?.addIceCandidate(candidate);
              }
            });
          });
          unsubs.push(unsubAnsIce);
        } else {
          // Joining call
          const callData = (await getDoc(callDoc)).data();
          if (callData?.offer) {
            const offerDescription = callData.offer;
            await pc.current.setRemoteDescription(
              new RTCSessionDescription(offerDescription),
            );

            const answerDescription = await pc.current.createAnswer();
            await pc.current.setLocalDescription(answerDescription);

            await updateDoc(callDoc, {
              answer: {
                type: answerDescription.type,
                sdp: answerDescription.sdp,
              },
            });

            const unsubOfferIce = onSnapshot(offerCandidates, (snapshot) => {
              snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                  const candidate = new RTCIceCandidate(change.doc.data());
                  pc.current?.addIceCandidate(candidate);
                }
              });
            });
            unsubs.push(unsubOfferIce);
          }
        }
      } catch (err) {
        console.error("Error setting up WebRTC", err);
      }
    };

    setupMedia();

    // Listen for call ending remotely
    const callDoc = doc(db, `chats/${chatId}/calls/active`);
    const unsubEnd = onSnapshot(callDoc, (snapshot) => {
      if (!snapshot.exists() || !snapshot.data()?.isActive) {
        handleHangup(false); // Hangup without destroying doc again
      }
    });
    unsubs.push(unsubEnd);

    return () => {
      unsubs.forEach((u) => u());
      localStream?.getTracks().forEach((t) => t.stop());
      pc.current?.close();
    };
  }, [chatId, isInitiator]);

  useEffect(() => {
    if (localVideoRef.current && localStream)
      localVideoRef.current.srcObject = localStream;
    if (remoteVideoRef.current && remoteStream)
      remoteVideoRef.current.srcObject = remoteStream;
  }, [localStream, remoteStream]);

  const handleHangup = async (endRemoteDoc = true) => {
    localStream?.getTracks().forEach((t) => t.stop());
    pc.current?.close();

    if (endRemoteDoc) {
      const callDoc = doc(db, `chats/${chatId}/calls/active`);
      await updateDoc(callDoc, { isActive: false }).catch(() => {});
      // optionally delete the doc
    }
    onEndCall();
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream
        .getVideoTracks()
        .forEach((t) => (t.enabled = !isVideoEnabled));
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      localStream
        .getAudioTracks()
        .forEach((t) => (t.enabled = !isAudioEnabled));
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#0A0A0C]/90 backdrop-blur-xl flex flex-col p-8">
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 bg-[#16161D] rounded-3xl overflow-hidden border border-white/10 relative shadow-2xl flex items-center justify-center">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 left-4 text-xs font-bold bg-black/50 px-3 py-1.5 rounded-full text-white backdrop-blur">
            Remote Peer
          </div>
        </div>

        <div className="w-1/4 max-w-sm bg-[#16161D] rounded-3xl overflow-hidden border border-white/10 relative shadow-xl flex items-center justify-center">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100" // Mirror local video
          />
          <div className="absolute bottom-4 left-4 text-xs font-bold bg-black/50 px-3 py-1.5 rounded-full text-zinc-300 backdrop-blur">
            You
          </div>
        </div>
      </div>

      <div className="h-24 flex items-center justify-center gap-6 shrink-0 mt-8">
        <button
          onClick={toggleAudio}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
            isAudioEnabled
              ? "bg-white/10 hover:bg-white/20 text-white"
              : "bg-red-500/20 text-red-500 border border-red-500/20"
          }`}
        >
          {isAudioEnabled ? (
            <Mic className="w-6 h-6" />
          ) : (
            <MicOff className="w-6 h-6" />
          )}
        </button>
        <button
          onClick={() => handleHangup(true)}
          className="w-20 h-14 rounded-2xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/20 transition-all font-bold tracking-wide"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
        <button
          onClick={toggleVideo}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
            isVideoEnabled
              ? "bg-white/10 hover:bg-white/20 text-white"
              : "bg-red-500/20 text-red-500 border border-red-500/20"
          }`}
        >
          {isVideoEnabled ? (
            <Video className="w-6 h-6" />
          ) : (
            <VideoOff className="w-6 h-6" />
          )}
        </button>
      </div>
    </div>
  );
}
