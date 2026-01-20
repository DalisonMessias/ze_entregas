import React, { useRef, useEffect, useState } from 'react';
import { BaseModal } from '../../BaseModal';
import { Button } from '../../Button';
import { Camera, RefreshCw, Check, X } from 'lucide-react';

interface CameraModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [cameraError, setCameraError] = useState(false);

    useEffect(() => {
        if (isOpen && !capturedImage) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => stopCamera();
    }, [isOpen, capturedImage]);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setCameraError(false);
        } catch (err) {
            console.error("Error accessing camera:", err);
            setCameraError(true);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const takePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg');
                setCapturedImage(dataUrl);
                stopCamera();
            }
        }
    };

    const retake = () => {
        setCapturedImage(null);
    };

    const confirmPhoto = async () => {
        if (capturedImage) {
            const res = await fetch(capturedImage);
            const blob = await res.blob();
            const file = new File([blob], `camera_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(file);
            onClose();
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Câmera"
            icon={<Camera className="w-6 h-6 text-purple-600" />}
        >
            <div className="flex flex-col items-center gap-4">
                {cameraError ? (
                    <div className="text-center p-8 bg-gray-100 rounded-xl w-full">
                        <p className="text-gray-500 mb-2">Não foi possível acessar a câmera.</p>
                        <Button onClick={startCamera}>Tentar Novamente</Button>
                    </div>
                ) : (
                    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-inner">
                        {!capturedImage ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover transform scale-x-[-1]" // Espelhar
                            />
                        ) : (
                            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover transform scale-x-[-1]" />
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                    </div>
                )}

                <div className="flex justify-center gap-4 w-full">
                    {!capturedImage ? (
                        <button
                            onClick={takePhoto}
                            className="w-16 h-16 rounded-full bg-red-500 border-4 border-white shadow-lg items-center justify-center flex hover:scale-105 transition-transform"
                        >
                            <Camera className="w-8 h-8 text-white" />
                        </button>
                    ) : (
                        <div className="flex gap-4 w-full justify-center">
                            <Button onClick={retake} variant="secondary" className="flex gap-2">
                                <RefreshCw className="w-4 h-4" /> Tirar Outra
                            </Button>
                            <Button onClick={confirmPhoto} className="bg-green-600 hover:bg-green-700 text-white flex gap-2">
                                <Check className="w-4 h-4" /> Enviar Foto
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </BaseModal>
    );
};
