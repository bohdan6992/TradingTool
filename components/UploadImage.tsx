"use client";
import { useState } from "react";

type Props = { onUploaded: (url:string)=>void, label?: string };

export default function UploadImage({ onUploaded, label="Завантажити зображення" }: Props){
  const [busy, setBusy] = useState(false);
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || process.env.CLOUDINARY_UPLOAD_PRESET;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>){
    const file = e.target.files?.[0];
    if(!file) return;
    if(!cloud || !preset){
      alert("Не задано CLOUDINARY_CLOUD_NAME / CLOUDINARY_UPLOAD_PRESET. Додай у .env.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", preset as string);
      // optional folder
      fd.append("folder", "tradingtool/strategies");
      const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method:"POST", body: fd });
      const j = await r.json();
      if(j.secure_url){ onUploaded(j.secure_url as string); }
      else { alert("Помилка завантаження: "+ JSON.stringify(j)); }
    } finally { setBusy(false); }
  }

  return (
    <label className={"btn inline-block cursor-pointer" + (busy?" opacity-60 pointer-events-none":"")}>
      📤 {label}
      <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </label>
  )
}
