import { ImageResponse } from "next/og";
import { siteDescription, siteName, siteTagline } from "@/lib/public-site";

export const alt = `${siteName} social preview`;
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(circle at top left, rgba(16,185,129,0.22), transparent 35%), linear-gradient(135deg, #f8fafc 0%, #ecfeff 40%, #ffffff 100%)",
          padding: "56px",
          color: "#020617",
          fontFamily: "Avenir Next, Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <div
            style={{
              height: "84px",
              width: "84px",
              borderRadius: "26px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#059669",
              color: "#ffffff",
              fontSize: "34px",
              fontWeight: 700,
              boxShadow: "0 18px 40px rgba(5,150,105,0.22)",
            }}
          >
            UB
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                fontSize: "22px",
                textTransform: "uppercase",
                letterSpacing: "0.28em",
                color: "#047857",
                fontWeight: 700,
              }}
            >
              {siteName}
            </div>
            <div style={{ fontSize: "22px", color: "#334155" }}>{siteTagline}</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "900px" }}>
          <div style={{ fontSize: "68px", lineHeight: 1.05, fontWeight: 700 }}>
            One verified daily digest for the public sources your team tracks.
          </div>
          <div style={{ fontSize: "28px", lineHeight: 1.45, color: "#475569" }}>
            {siteDescription}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "16px",
            fontSize: "22px",
            color: "#0f172a",
          }}
        >
          <div
            style={{
              borderRadius: "999px",
              background: "#ffffff",
              padding: "14px 22px",
              boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
            }}
          >
            Combined digests
          </div>
          <div
            style={{
              borderRadius: "999px",
              background: "#ffffff",
              padding: "14px 22px",
              boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
            }}
          >
            Local delivery time
          </div>
          <div
            style={{
              borderRadius: "999px",
              background: "#ffffff",
              padding: "14px 22px",
              boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
            }}
          >
            Public monitoring
          </div>
        </div>
      </div>
    ),
    size,
  );
}
