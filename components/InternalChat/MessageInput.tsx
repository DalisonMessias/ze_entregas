import React, { useState, useRef } from 'react';
import { Send, Paperclip, X, Loader2, Smile, Mic, Plus } from 'lucide-react';
import AttachmentMenu from './AttachmentMenu';
import { CameraModal } from './Modals/CameraModal';
import { PollModal } from './Modals/PollModal';
import { ContactPickerModal } from './Modals/ContactPickerModal';
import { StickerPickerModal } from './Modals/StickerPickerModal';

interface MessageInputProps {
  onSend: (text: string) => void;
  onSendMedia?: (file: File) => void;
  onSendAudio?: (blob: Blob) => void;
  pixKey?: string;
  storeId?: string;
}

import * as cloud from '../../services/cloud';
import { QuickReply } from '../../types';

const MessageInput: React.FC<MessageInputProps> = ({ onSend, onSendMedia, onSendAudio, pixKey, storeId }) => {
  const [text, setText] = useState('');
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [filteredReplies, setFilteredReplies] = useState<QuickReply[]>([]);
  const [selectedReplyIndex, setSelectedReplyIndex] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal States
  const [showCamera, setShowCamera] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [showSticker, setShowSticker] = useState(false);

  React.useEffect(() => {
    if (storeId) {
      cloud.getQuickReplies(storeId).then(setReplies);
    }
  }, [storeId]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);

    // Auto-resize similar ao Menu Digital
    e.target.style.height = 'auto';
    const newHeight = Math.min(e.target.scrollHeight, 150);
    e.target.style.height = newHeight + 'px';

    // Lógica de Respostas Rápidas
    if (value.startsWith('/')) {
      const searchTerm = value.substring(1).toLowerCase();
      const matches = replies.filter(r =>
        r.trigger.toLowerCase().startsWith(searchTerm)
      );

      if (matches.length > 0) {
        setFilteredReplies(matches);
        setShowQuickReplies(true);
        setSelectedReplyIndex(0);
      } else {
        setShowQuickReplies(false);
      }
    } else {
      setShowQuickReplies(false);
    }
  };

  const applyQuickReply = (reply: QuickReply) => {
    setText(reply.message);
    setShowQuickReplies(false);
  };

  const handleCameraCapture = (file: File) => {
    onSendMedia?.(file);
  };

  const handlePollSend = (poll: { question: string; options: string[]; allowMultiple: boolean }) => {
    // Format: POLL:{"question":"...","options":["..."],"allowMultiple":true}
    const payload = JSON.stringify(poll);
    onSend(`POLL:${payload}`);
  };

  const handleContactSelect = (contact: { name: string; phone: string }) => {
    // Format: CONTACT:{"name":"...","phone":"..."}
    const payload = JSON.stringify(contact);
    onSend(`CONTACT:${payload}`);
  };

  const handleStickerSelect = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], `sticker_${Date.now()}.webp`, { type: 'image/webp' });
      onSendMedia?.(file);
    } catch (e) {
      console.error("Error sending sticker", e);
    }
  };


  const handleSend = () => {
    if (text.trim()) {
      onSend(text);
      setText('');
      setShowEmojiPicker(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      alert('Não foi possível acessar o microfone.');
    }
  };

  const stopRecording = (send: boolean) => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        if (send && audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          if (onSendAudio) {
            onSendAudio(audioBlob);
          }
        }
        // Limpar tracks do stream
        if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      };
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const addEmoji = (emoji: string) => {
    setText(prev => prev + emoji);
  };

  const commonEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '🥵', '🥶', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🤲', '👐', '🙌', '👏', '🤝', '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤏', '👈', '👉', '👆', '👇', '✋', '🤚', '🖐', '🖖', '👋', '🤙', '💪', '🦾', '🖕', '✍️', '🙏', '🦶', '🦵', '🦿', '💄', '💋', '👄', '🦷', '👅', '👂', '🦻', '👃', '👣', '👁', '👀', '🧠', '🗣', '👤', '👥', '🫂', '👶', '👧', '🧒', '👦', '👩', '🧑', '👨', '👩‍🦱', '🧑‍🦱', '👨‍🦱', '👩‍🦰', '🧑‍🦰', '👨‍🦰', '👱‍♀️', '👱', '👱‍♂️', '👩‍🦳', '🧑‍🦳', '👨‍🦳', '👩‍🦲', '🧑‍🦲', '👨‍🦲', '🧔', '👵', '🧓', '👴', '👲', '👳‍♀️', '👳', '👳‍♂️', '🧕', '👮‍♀️', '👮', '👮‍♂️', '👷‍♀️', '👷', '👷‍♂️', '💂‍♀️', '💂', '💂‍♂️', '🕵️‍♀️', '🕵️', '🕵️‍♂️', '👩‍⚕️', '🧑‍⚕️', '👨‍⚕️', '👩‍🌾', '🧑‍🌾', '👨‍🌾', '👩‍🍳', '🧑‍🍳', '👨‍🍳', '👩‍🎓', '🧑‍🎓', '👨‍🎓', '👩‍🎤', '🧑‍🎤', '👨‍🎤', '👩‍🏫', '🧑‍🏫', '👨‍🏫', '👩‍🏭', '🧑‍🏭', '👨‍🏭', '👩‍💻', '🧑‍💻', '👨‍💻', '👩‍💼', '🧑‍💼', '👨‍💼', '👩‍🔧', '🧑‍🔧', '👨‍🔧', '👩‍🔬', '🧑‍🔬', '👨‍🔬', '👩‍🎨', '🧑‍🎨', '👨‍🎨', '👩‍🚒', '🧑‍🚒', '👨‍🚒', '👩‍✈️', '🧑‍✈️', '👨‍✈️', '👩‍🚀', '🧑‍🚀', '👨‍🚀', '👩‍⚖️', '🧑‍⚖️', '👨‍⚖️', '👰', '🤵', '👸', '🤴', '🦸‍♀️', '🦸', '🦸‍♂️', '🦹‍♀️', '🦹', '🦹‍♂️', '🤶', '🎅', '🧙‍♀️', '🧙', '🧙‍♂️', '🦹‍♀️', '🦹', '🦹‍♂️', '🧚‍♀️', '🧚', '🧚‍♂️', '🧛‍♀️', '🧛', '🧛‍♂️', '🧜‍♀️', '🧜', '🧜‍♂️', '🧝‍♀️', '🧝', '🧝‍♂️', '🧞‍♀️', '🧞', '🧞‍♂️', '🧟‍♀️', '🧟', '🧟‍♂️', '💆‍♀️', '💆', '💆‍♂️', '💇‍♀️', '💇', '💇‍♂️', '🚶‍♀️', '🚶', '🚶‍♂️', '🏃‍♀️', '🏃', '🏃‍♂️', '🧍‍♀️', '🧍', '🧍‍♂️', '🧎‍♀️', '🧎', '🧎‍♂️', '👩‍🦯', '🧑‍🦯', '👨‍🦯', '👩‍🦼', '🧑‍🦼', '👨‍🦼', '👩‍🦽', '🧑‍🦽', '👨‍🦽', '💃', '🕺', '👫', '👭', '👬', '👩‍❤️‍👨', '👩‍❤️‍👩', '👨‍❤️‍👨', '👩‍❤️‍💋‍👨', '👩‍❤️‍💋‍👩', '👨‍❤️‍💋‍👨', '👨‍👩‍👦', '👨‍👩‍👧', '👨‍👩‍👧‍👦', '👨‍👩‍👦‍👦', '👨‍👩‍👧‍👧', '👩‍👩‍👦', '👩‍👩‍👧', '👩‍👩‍👧‍👦', '👩‍👩‍👦‍👦', '👩‍👩‍👧‍👧', '👨‍👨‍👦', '👨‍👨‍👧', '👨‍👨‍👧‍👦', '👨‍👨‍👦‍👦', '👨‍👨‍👧‍👧', '👩‍👦', '👩‍👧', '👩‍👧‍👦', '👩‍👦‍👦', '👩‍👧‍👧', '👨‍👦', '👨‍👧', '👨‍👧‍👦', '👨‍👦‍👦', '👨‍👧‍👧', '🧶', '🧵', '🧥', '🥼', '🦺', '👚', '👕', '👖', '🧣', '🧤', '🧥', '🧦', '👗', '👘', '🥻', '🩱', '🩲', '🩳', '👙', '👛', '👜', '👝', '🎒', '👞', '👟', '🥾', '🥿', '👠', '👡', '🩰', '👢', '👑', '👒', '🎩', '🎓', '🧢', '⛑', '💄', '💍', '💼', '🪵', '🌵', '🎄', '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀', '🎍', '🎋', '🍃', '🍂', '🍁', '🍄', '🐚', '🌾', '💐', '🌷', '🌹', '🥀', '🌺', '🌸', '🌼', '🌻', '🌞', '🌝', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔', '🌙', '🌎', '🌍', '🌏', '🪐', '💫', '⭐️', '🌟', '✨', '⚡️', '☄️', '💥', '🔥', '🌪', '🌈', '☀️', '🌤', '⛅️', '🌥', '☁️', '🌦', '☁️', '🌧', '⛈', '🌩', '🌨', '❄️', '☃️', '⛄️', '🌬', '💨', '💧', '💦', '☔️', '☂️', '🌊', '🌫', '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕️', '🍵', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🧊', '🥢', '🍽', '🍴', '🥄', '🏺', '⚽️', '🏀', '🏈', '⚾️', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏹', '🎣', '🤿', '🥊', '🥋', '⛸', '🎿', '🛷', ' curling_stone', '🎯', '🪀', '🪁', '🎱', '🔮', '🧿', '🎮', '🕹', '🎰', '🎲', '🧩', '🧸', '♠️', '♥️', '♦️', '♣️', '♟', '🃏', '🀄️', '🎴', '🎭', '🖼', '🎨', '🧵', '🧶', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🛵', '🏍', '🛺', '🚲', '🛴', '🛹', '🚏', '🛣', '🛤', '⛽️', '🚨', '🚥', '🚦', '🛑', '🚧', '⚓️', '⛵️', '🛶', '🚤', '🛳', '⛴', '🚢', '✈️', '🛩', '🛫', '🛬', '🪂', '💺', '🚁', '🚟', '🚠', '🚡', '🚀', '🛸', '🛰', '⌛️', '⏳', '⌚️', '⏰', '⏱', '⏲', '🕰', '🕛', '🕧', '🕐', '🕜', '🕑', '🕝', '🕒', '🕞', '🕓', '🕟', '🕔', '🕠', '🕕', '🕡', '🕖', '🕢', '🕗', '🕣', '🕘', '🕤', '🕙', '🕥', '🕚', '🕦', '🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘', '🌙', '🌚', '🌛', '🌜', '🌡', '☀️', '🌝', '🌞', '🪐', '🌟', '⭐️', '🌠', '🌌', '☁️', '⛅️', '⛈', '🌤', '🌥', '🌦', '🌧', '🌨', '🌩', '🌪', '🌫', '🌬', '🌀', '🌈', '🌂', '☔️', '💦', '💧', '🌊', '🔇', '🔈', '🔉', '🔊', '📢', '📣', '📯', '🔔', '🔕', '🎼', '🎵', '🎶', '🎙', '🎚', '🎛', '🎤', '🎧', '📻', '🎷', '🪕', '🎸', '🎹', '🎺', '🎻', '🪕', '🥁', '📱', '📲', '☎️', '📞', '📟', '📠', '🔋', '🔌', '💻', '🖥', '🖨', '⌨️', '🖱', '🖲', '💽', '💾', '💿', '📀', '🧮', '🎥', '🎞', '📽', '🎬', '📺', '📷', '📸', '📹', '📼', '🔍', '🔎', '🕯', '💡', '🔦', '🏮', '🪔', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📓', '📒', '📃', '📜', '📄', '📰', '🗞', '📑', '🔖', '🏷', '💰', '💴', '💵', '💶', '💷', '💸', '💳', '🧾', '💹', '✉️', '📧', '📨', '📩', '📤', '📥', '📦', '📫', '📪', '📬', '📭', '📮', '🗳', '✏️', '✒️', '🖋', '🖊', '🖌', '🖍', '📝', '💼', '📁', '📂', '🗂', '📅', '📆', '🗒', '🗓', '📇', '📈', '📉', '📊', '📋', '📌', '📍', '📎', '🖇', '📏', '📐', '✂️', '🗃', '🗄', '🗑', '🔒', '🔓', '🔏', '🔐', '🔑', '🗝', '🔨', '🪓', '⛏', '⚒', '🛠', '🗡', '⚔️', '🔫', '🪃', '🏹', '🛡', '🔧', '🔩', '⚙️', '🗜', '⚖️', '🦯', '🔗', '⛓', '🧰', '🧲', '⚗️', '🧪', '🌡', '🧬', '🔬', '🔭', '📡', '💉', '🩸', '💊', '🩹', '🩺', '🚪', '🛏', '🛋', '🪑', '🚽', '🚿', '🛁', '🪒', '🧴', '🧼', '🧽', '🪣', '🧹', '🧺', '🧻', '🧼', '🧽', '🧴', '🛍', '🛒', '🎁', '🎈', '🎏', '🎀', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷', '💳', '💰', '💸', '💎', '⚖️', '🗝', '🔐', '🔒', '🔓', '🔏', '🔐', '🔍', '🔎', '💡', '🔦', '🏮', '🧱', '🚪', '🪑', '🛋', '🛏', '🛌', '🖼', '🛍', '🛒', '🎁', '🎈', '🎏', '🎀', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷', '💳', '💰', '💸', '💎', '⚖️', '🗝', '🔐', '🔒', '🔓', '🔏', '🔐', '🔍', '🔎', '💡', '🔦', '🏮', '🧱', '🚪', '🪑', '🛋', '🛏', '🛌', '🖼', '📜', '📄', '📑', '📊', '📈', '📉', '📁', '📂', '🗂', '📅', '📆', '🗒', '🗓', '📇', '📋', '📌', '📍', '📎', '🖇', '📏', '📐', '✂️', '🗃', '🗄', '🗑', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈️', '♉️', '♊️', '♋️', '♌️', '♍️', '♎️', '♏️', '♐️', '♑️', '♒️', '♓️', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚️', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕️', '🛑', '⛔️', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗️', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯️', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿️', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '⚧', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸', '⏯', '⏹', '⏺', '⏭', '⏮', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '♾', '💲', '💱', '™️', '©️', '®️', '👁‍🗨', '🔚', '🔙', '🔛', '🔝', '🔜', '〰️', '➰', '➿', '✔️', '☑️', '🔘', '⚪️', '⚫️', '🔴', '🔵', '🟤', '🟣', '🟢', '🟡', '🟠', '🟥', '🟦', '🟫', '🟪', '🟩', '🟨', '🟧', '⬛️', '⬜️', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '💬', '💭', '🗯', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄️', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕥', '🕦', '🕧'
  ];


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowMenu(false);
    }
  };

  const handleMenuSelect = (type: string) => {
    setShowMenu(false);
    if (type === 'image') {
      fileInputRef.current?.setAttribute('accept', 'image/*,video/*');
      fileInputRef.current?.click();
    } else if (type === 'document') {
      fileInputRef.current?.setAttribute('accept', '*/*');
      fileInputRef.current?.click();
    } else if (type === 'pix') {
      const keyToUse = pixKey || "";
      if (!keyToUse) {
        alert("Nenhuma chave PIX configurada.");
        return;
      }
      onSend(`Chave PIX da Loja:\n${keyToUse}\n\nPor favor, envie o comprovante após o pagamento.`);
    } else if (type === 'camera') {
      setShowCamera(true);
    } else if (type === 'poll') {
      setShowPoll(true);
    } else if (type === 'contact') {
      setShowContact(true);
    } else if (type === 'sticker') {
      setShowSticker(true);
    }
  };

  const handleSendMedia = async () => {
    if (selectedFile && onSendMedia) {
      setIsUploading(true);
      try {
        await onSendMedia(selectedFile);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Erro ao enviar mídia:', error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const cancelMedia = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showQuickReplies) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedReplyIndex(prev => (prev + 1) % filteredReplies.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedReplyIndex(prev => (prev - 1 + filteredReplies.length) % filteredReplies.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        applyQuickReply(filteredReplies[selectedReplyIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowQuickReplies(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();

      const trimmedText = text.trim();
      if (trimmedText) {
        onSend(trimmedText);
        setText('');
        setShowEmojiPicker(false);

        // Reset height similar ao Menu Digital
        const target = e.currentTarget;
        setTimeout(() => {
          target.style.height = 'auto';
        }, 0);
      }
    }
  };

  return (
    <div className="w-full relative">
      <AttachmentMenu
        isOpen={showMenu}
        onClose={() => setShowMenu(false)}
        onSelect={handleMenuSelect}
      />

      {/* Preview de Arquivo */}
      {selectedFile && (
        <div className="absolute bottom-full w-full px-4 py-2 bg-[#F0F2F5] border-t border-gray-200 flex items-center justify-between animate-in slide-in-from-bottom-2 z-10">
          <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm">
            <div className="bg-gray-100 p-2 rounded">
              <Paperclip size={20} className="text-gray-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">{selectedFile.name}</span>
              <span className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={cancelMedia}
              className="p-2 hover:bg-gray-200 rounded-full text-red-500 transition-colors"
              disabled={isUploading}
            >
              <X size={20} />
            </button>
            <button
              onClick={handleSendMedia}
              disabled={isUploading}
              className="p-2 bg-brand-600 hover:bg-brand-700 text-white rounded-full transition-colors disabled:opacity-50"
            >
              {isUploading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </div>
      )}

      {/* Barra de Input */}
      <div className="relative px-4 py-2 bg-[#F0F2F5] flex items-end gap-2 items-center z-20">
        <input
          ref={fileInputRef}
          className="hidden"
          accept="image/*,audio/*,video/*,.pdf,.doc,.docx"
          type="file"
          onChange={handleFileSelect}
        />

        <div className="flex gap-2 text-[#54656F] items-center">
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={`p-2 rounded-full transition-colors ${showEmojiPicker ? 'bg-gray-200 text-[#111B21]' : 'hover:bg-gray-200'}`}
              title="Emojis"
            >
              <Smile size={24} />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-full left-0 mb-2 p-3 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 w-[280px] sm:w-[350px] animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Emojis</span>
                  <button
                    onClick={() => setShowEmojiPicker(false)}
                    className="p-1 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-9 gap-1 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                  {commonEmojis.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => addEmoji(emoji)}
                      className="text-2xl hover:bg-gray-100 p-1.5 rounded-xl transition-all active:scale-90 hover:scale-110"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Popover de Respostas Rápidas */}
          {showQuickReplies && (
            <div className="absolute bottom-full left-12 mb-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[60] animate-in slide-in-from-bottom-4">
              <div className="bg-brand-50 px-4 py-2 border-b border-brand-100">
                <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">Respostas Rápidas</span>
              </div>
              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                {filteredReplies.map((reply, idx) => (
                  <button
                    key={reply.id}
                    onClick={() => applyQuickReply(reply)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex flex-col gap-0.5 border-b border-gray-50 last:border-0 transition-colors ${idx === selectedReplyIndex ? 'bg-brand-50/50' : ''}`}
                  >
                    <span className="text-xs font-black text-brand-600">{reply.trigger}</span>
                    <span className="text-sm text-gray-700 truncate">{reply.message}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`p-2 rounded-full transition-colors ${showMenu ? 'bg-gray-200 text-[#111B21]' : 'hover:bg-gray-200'}`}
            title="Anexar"
          >
            <Plus size={24} className={`transition-transform duration-200 ${showMenu ? 'rotate-45' : ''}`} />
          </button>
        </div>

        <div className="flex-1 bg-white rounded-lg flex items-center border border-white focus-within:border-white py-1">
          {isRecording ? (
            <div className="flex-1 px-4 py-2 flex items-center justify-between text-[#ef4444] animate-pulse">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-sm font-medium">Gravando {formatTime(recordingTime)}</span>
              </div>
              <button
                onClick={() => stopRecording(false)}
                className="text-gray-500 hover:text-red-500 text-xs font-bold"
              >
                CANCELAR
              </button>
            </div>
          ) : (
            <textarea
              placeholder="Digite uma mensagem"
              className="flex-1 px-4 py-1.5 bg-transparent outline-none text-[#111B21] placeholder:text-gray-500 text-[15px] resize-none max-h-[150px] overflow-hidden custom-scrollbar leading-relaxed"
              rows={1}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              style={{ minHeight: '36px' }}
            />
          )}
        </div>

        <div className="flex items-center">
          {text.trim() || isRecording ? (
            <button
              onClick={isRecording ? () => stopRecording(true) : handleSend}
              className={`p-2 transition-colors ${isRecording ? 'text-red-500 hover:text-red-600' : 'text-[#54656F] hover:text-[#111B21]'}`}
              title={isRecording ? "Enviar Áudio" : "Enviar Mensagem"}
            >
              <Send size={24} />
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="p-2 text-[#54656F] hover:text-[#111B21] transition-colors"
              title="Gravar Voz"
            >
              <Mic size={24} />
            </button>
          )}
        </div>
      </div>
      <CameraModal isOpen={showCamera} onClose={() => setShowCamera(false)} onCapture={handleCameraCapture} />
      <PollModal isOpen={showPoll} onClose={() => setShowPoll(false)} onSend={handlePollSend} />
      <ContactPickerModal isOpen={showContact} onClose={() => setShowContact(false)} onSelect={handleContactSelect} storeId={storeId} />
      {storeId && <StickerPickerModal isOpen={showSticker} onClose={() => setShowSticker(false)} onSelect={handleStickerSelect} storeId={storeId} />}
    </div>
  );
};

export default MessageInput;
