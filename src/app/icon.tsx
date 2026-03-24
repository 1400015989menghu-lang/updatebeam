import { ImageResponse } from "next/og";
import { siteBrandColor, siteBrandDark } from "@/lib/public-site";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(135deg, ${siteBrandColor} 0%, ${siteBrandDark} 100%)`,
          borderRadius: "112px",
          color: "#ffffff",
          fontFamily: "Avenir Next, Arial, sans-serif",
          fontWeight: 700,
          fontSize: "220px",
          letterSpacing: "-0.08em",
        }}
      >
        UB
      </div>
    ),
    size,
  );
}
