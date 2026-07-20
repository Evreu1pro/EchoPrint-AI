import { NextResponse } from "next/server";

/** Health / module index */
export async function GET() {
  return NextResponse.json({
    name: "EchoPrint AI",
    version: "3.0.0",
    modules: {
      fp: {
        id: 1,
        path: "/api/fp",
        methods: ["GET", "POST"],
        description:
          "M1 Network: IP intel (ASN/type/VPN), JA3/JA4 headers, header order, WebRTC vs HTTP, geo↔tz",
      },
    },
  });
}
