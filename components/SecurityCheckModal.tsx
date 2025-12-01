import React, { useRef, useState, useEffect } from 'react';
import { Camera, MapPin, Loader2, CheckCircle, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';

interface SecurityCheckModalProps {
    onVerified: () => void;
    onClose: () => void;
}

export const SecurityCheckModal: React.FC<SecurityCheckModalProps> = ({ onVerified, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [step, setStep] = useState<'camera' | 'location' | 'verifying' | 'success' | 'error'>('camera');
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
    const [location, setLocation] = useState<{ lat: number, lng: number, accuracy: number } | null>(null);

    // Initialize Camera
    useEffect(() => {
        const startCamera = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'user' } 
                });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (e) {
                console.error(e);
                setStep('error');
                setErrorMsg("Erro ao acessar câmera. Permissão necessária.");
            }
        };

        if (step === 'camera') {
            startCamera();
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [step]);

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (blob) {
                    setPhotoBlob(blob);
                    setStep('location');
                    // Stop camera stream to save battery/resources
                    if (stream) {
                        stream.getTracks().forEach(track => track.stop());
                        setStream(null);
                    }
                }
            }, 'image/jpeg', 0.8);
        }
    };

    const getLocation = () => {
        if (!navigator.geolocation) {
            setStep('error');
            setErrorMsg("Geolocalização não suportada.");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                });
                handleVerification(pos.coords);
            },
            (err) => {
                setStep('error');
                setErrorMsg("Erro ao obter localização. Permissão necessária.");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const handleVerification = async (coords: GeolocationCoordinates) => {
        setStep('verifying');
        if (!photoBlob) return;

        try {
            const file = new File([photoBlob], "selfie.jpg", { type: "image/jpeg" });
            
            await cloud.uploadIdentityVerification(file, {
                lat: coords.latitude,
                lng: coords.longitude,
                accuracy: coords.accuracy
            });

            setStep('success');
            setTimeout(() => {
                onVerified();
            }, 1500);

        } catch (e: any) {
            setStep('error');
            setErrorMsg("Falha na verificação: " + e.message);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[80] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 text-center">
                    <ShieldCheck className="w-10 h-10 text-brand-600 mx-auto mb-2" />
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">Verificação de Segurança</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Para sua segurança e do sistema.</p>
                </div>

                <div className="p-6 flex flex-col items-center justify-center flex-1 min-h-[300px]">
                    
                    {step === 'camera' && (
                        <div className="w-full flex flex-col items-center">
                            <p className="text-sm text-center mb-4 text-gray-600 dark:text-gray-300">
                                Tire uma selfie clara do seu rosto.
                            </p>
                            <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-brand-500 shadow-xl mb-6 bg-black">
                                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror-mode" />
                            </div>
                            <Button onClick={capturePhoto} className="w-full py-4 text-lg rounded-full shadow-lg">
                                <Camera className="w-6 h-6 mr-2" /> Capturar Foto
                            </Button>
                        </div>
                    )}

                    {step === 'location' && (
                        <div className="text-center">
                            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                                <MapPin className="w-10 h-10 text-blue-600" />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Verificando Localização</h4>
                            <p className="text-sm text-gray-500 mb-6">Estamos confirmando se você está na área de atuação.</p>
                            <Button onClick={getLocation} className="w-full py-3">
                                Permitir Localização
                            </Button>
                        </div>
                    )}

                    {step === 'verifying' && (
                        <div className="text-center">
                            <Loader2 className="w-16 h-16 text-brand-600 animate-spin mx-auto mb-6" />
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white">Analisando dados...</h4>
                            <p className="text-sm text-gray-500 mt-2">Isso pode levar alguns segundos.</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center animate-in zoom-in">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h4 className="text-2xl font-black text-gray-900 dark:text-white">Tudo Certo!</h4>
                            <p className="text-sm text-gray-500 mt-2">Turno iniciado com sucesso.</p>
                        </div>
                    )}

                    {step === 'error' && (
                        <div className="text-center animate-in shake">
                            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle className="w-10 h-10 text-red-600" />
                            </div>
                            <h4 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">Erro na Verificação</h4>
                            <p className="text-sm text-gray-500 mb-6">{errorMsg}</p>
                            <div className="flex gap-3 w-full">
                                <Button variant="outline" onClick={onClose} fullWidth>Cancelar</Button>
                                <Button onClick={() => setStep('camera')} fullWidth>Tentar Novamente</Button>
                            </div>
                        </div>
                    )}

                    {/* Hidden Canvas for Photo Capture */}
                    <canvas ref={canvasRef} className="hidden" />
                </div>
            </div>
        </div>
    );
};