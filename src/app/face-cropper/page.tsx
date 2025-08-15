"use client";
import { useRef, useState } from "react";
import { smartCropFace } from "../utils/smartCropFace";

export default function Page() {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [cropped, setCropped] = useState<string[]>([]);
  const [personCrops, setPersonCrops] = useState<string[]>([]);
  const [noFace, setNoFace] = useState(false);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (!imgRef.current) return;
    imgRef.current.onload = async () => {
      const out = await smartCropFace({
        img: imgRef.current as HTMLImageElement,
        padding: 0.7,
        aspect: 1,
        maxFaces: 4,
        debug: true,
      });
      setCropped(out.faces);
      setPersonCrops(out.debug?.personCrops ?? []);
      setNoFace(out.faces.length === 0);
    };
    imgRef.current.src = url;
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <input type="file" accept="image/*" onChange={onFile} />
      <img ref={imgRef} alt="" style={{ maxWidth: 320, display: "block" }} />
      {personCrops.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
            Person crop(s) sent into short-range face detection
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
            }}
          >
            {personCrops.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Person crop ${i + 1}`}
                style={{
                  width: 150,
                  height: 150,
                  objectFit: "cover",
                  borderRadius: 8,
                }}
              />
            ))}
          </div>
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 16,
        }}
      >
        {cropped.map((url, i) => (
          <img
            key={i}
            src={url}
            alt={`Face ${i + 1}`}
            style={{
              width: 150,
              height: 150,
              objectFit: "cover",
              borderRadius: 8,
            }}
          />
        ))}
      </div>
      {noFace && <div style={{ color: "#666" }}>No faces detected.</div>}
    </div>
  );
}
