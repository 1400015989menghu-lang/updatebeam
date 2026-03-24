import { ImageResponse } from "next/og";
import { siteBrandColor, siteBrandDark } from "@/lib/public-site";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
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
          borderRadius: "44px",
          color: "#ffffff",
          fontFamily: "Avenir Next, Arial, sans-serif",
          fontWeight: 700,
          fontSize: "82px",
          letterSpacing: "-0.08em",
        }}
      >
        UB
      </div>
    ),
    size,
  );
}
