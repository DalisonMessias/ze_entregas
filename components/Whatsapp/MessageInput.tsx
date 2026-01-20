import React, { useState, useRef } from 'react';
import { Send, Paperclip, X, Loader2, Smile, Mic, Plus } from 'lucide-react';
import AttachmentMenu from './AttachmentMenu';

interface MessageInputProps {
  onSend: (text: string) => void;
  onSendMedia?: (file: File) => void;
  onSendAudio?: (blob: Blob) => void;
  pixKey?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSend, onSendMedia, onSendAudio, pixKey }) => {
  const [text, setText] = useState('');
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
    if (type === 'image') {
      fileInputRef.current?.setAttribute('accept', 'image/*,video/*');
      fileInputRef.current?.click();
    } else if (type === 'document') {
      fileInputRef.current?.setAttribute('accept', '*/*');
      fileInputRef.current?.click();
    } else if (type === 'pix') {
      const keyToUse = pixKey || "00020126580014BR.GOV.BCB.PIX013612345678-1234-1234-1234-1234567890125204000053039865802BR5913LOJAEXEMPLO6008CIDADE62070503***63041234";
      onSend(`Chave PIX da Loja:\n${keyToUse}\n\nPor favor, envie o comprovante após o pagamento.`);
      setShowMenu(false);
    } else if (type === 'camera') {
      fileInputRef.current?.setAttribute('accept', 'image/*');
      fileInputRef.current?.setAttribute('capture', 'environment');
      fileInputRef.current?.click();
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
              className="p-2 bg-[#00A884] hover:bg-[#008f6f] text-white rounded-full transition-colors disabled:opacity-50"
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
              <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-lg shadow-xl border border-gray-200 grid grid-cols-6 sm:grid-cols-8 gap-2 z-50 w-[240px] sm:w-[320px] max-h-[300px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-2">
                {commonEmojis.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => addEmoji(emoji)}
                    className="text-2xl hover:bg-gray-100 p-1 rounded transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
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
              className="flex-1 px-4 py-1.5 bg-transparent outline-none text-[#111B21] placeholder:text-gray-500 text-[15px] resize-none max-h-32 custom-scrollbar"
              rows={1}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 128) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.stopPropagation();

                  const trimmedText = text.trim();
                  if (trimmedText) {
                    onSend(trimmedText);
                    setText('');
                    setShowEmojiPicker(false);
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = '36px';
                  }
                }
              }}
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
    </div>
  );
};

export default MessageInput;
