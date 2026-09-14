import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#b5651d",
          borderRadius: 0,
          color: "#faf6ef",
          fontSize: 110,
        }}
      >
        ♥
      </div>
    ),
    size,
  );
}
