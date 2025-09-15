"use client";
import { useState } from "react";

type Props = { onUploaded: (url: string) => void; label?: string };

export default function UploadImage({ onUploaded, label = "Завантажити іконку" }: Props) {
  const [busy, setBusy] = useState(false);
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || process.env.CLOUDINARY_UPLOAD_PRESET;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!cloud || !preset) {
      alert("Додай CLOUDINARY_CLOUD_NAME і CLOUDINARY_UPLOAD_PRESET у .env.local");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", String(preset));
      fd.append("folder", "tradingtool/strategies");
      const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: fd });
      const j = await r.json();
      if (j.secure_url) onUploaded(j.secure_url as string);
      else alert("Помилка завантаження: " + JSON.stringify(j));
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className={`btn cursor-pointer ${busy ? "opacity-60 pointer-events-none" : ""}`}>
      📤 {label}
      <input className="hidden" type="file" accept="image/*" onChange={handleFile} />
    </label>
  );
}
