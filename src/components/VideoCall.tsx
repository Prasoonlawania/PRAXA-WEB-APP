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
  isVideoCall: boolean;
  userId: string;
  onEndCall: () => void;
}

export function VideoCall({ chatId, isInitiator, isVideoCall, userId, onEndCall }: VideoCallProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(isVideoCall);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const pc = useRef<RTCPeerConnection | null>(null);

  const localVideoRef = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement & HTMLAudioElement>(null);

  useEffect(() => {
    let unsubs: (() => void)[] = [];
    let currentLocalStream: MediaStream | null = null;
    let peerConnection: RTCPeerConnection | null = null;
    let isUnmounted = false;

    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isVideoCall,
          audio: true,
        });
        if (isUnmounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        
        currentLocalStream = stream;
        setLocalStream(stream);

        peerConnection = new RTCPeerConnection(servers);
        pc.current = peerConnection;

        stream.getTracks().forEach((track) => {
          peerConnection?.addTrack(track, stream);
        });

        peerConnection.ontrack = (event) => {
          if (event.streams && event.streams[0]) {
            setRemoteStream(event.streams[0]);
          } else {
            setRemoteStream(prev => {
              const stream = prev || new MediaStream();
              stream.addTrack(event.track);
              // Force re-render to ensure video element picks it up if it was empty
              return new MediaStream(stream.getTracks());
            });
          }
        };

        const callDoc = doc(db, `chats/${chatId}/calls/active`);
        const offerCandidates = collection(callDoc, "offerCandidates");
        const answerCandidates = collection(callDoc, "answerCandidates");

        if (isInitiator) {
          // Clear old candidates synchronously before doing WebRTC stuff
          const { getDocs } = await import("firebase/firestore");
          const oldOffers = await getDocs(offerCandidates);
          oldOffers.forEach((d) => deleteDoc(d.ref));
          const oldAnswers = await getDocs(answerCandidates);
          oldAnswers.forEach((d) => deleteDoc(d.ref));
        }

        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            addDoc(
              isInitiator ? offerCandidates : answerCandidates,
              event.candidate.toJSON(),
            );
          }
        };

        if (isInitiator) {
          const offerDescription = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offerDescription);

          await setDoc(callDoc, {
            offer: { type: offerDescription.type, sdp: offerDescription.sdp },
            isActive: true,
            isVideo: isVideoCall,
            initiator: userId,
          }, { merge: true });

          const unsubCall = onSnapshot(callDoc, async (snapshot) => {
            const data = snapshot.data();
            if (!peerConnection?.currentRemoteDescription && data?.answer) {
              const answerDescription = new RTCSessionDescription(data.answer);
              await peerConnection?.setRemoteDescription(answerDescription);

              const unsubAnsIce = onSnapshot(answerCandidates, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                  if (change.type === "added") {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    peerConnection?.addIceCandidate(candidate).catch((e) => console.error(e));
                  }
                });
              });
              unsubs.push(unsubAnsIce);
            }
          });
          unsubs.push(unsubCall);
        } else {
          // Joining call
          const callData = (await getDoc(callDoc)).data();
          if (callData?.offer) {
            const offerDescription = callData.offer;
            await peerConnection.setRemoteDescription(
              new RTCSessionDescription(offerDescription),
            );

            const answerDescription = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answerDescription);

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
                  peerConnection?.addIceCandidate(candidate).catch((e) => console.error(e));
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
      isUnmounted = true;
      unsubs.forEach((u) => u());
      currentLocalStream?.getTracks().forEach((t) => t.stop());
      peerConnection?.close();
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
            className={`w-full h-full object-cover ${isVideoCall ? "" : "hidden"}`}
          />
          {!isVideoCall && (
            <div className="w-32 h-32 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-xl">
                 <Mic className="w-12 h-12 text-indigo-400 animate-pulse" />
            </div>
          )}
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
            className={`w-full h-full object-cover transform -scale-x-100 ${isVideoCall ? "" : "hidden"}`}
          />
          {!isVideoCall && (
            <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-xl">
              {isAudioEnabled ? <Mic className="w-8 h-8 text-indigo-400" /> : <MicOff className="w-8 h-8 text-red-400" />}
            </div>
          )}
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
        {isVideoCall && (
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
        )}
      </div>
    </div>
  );
}
