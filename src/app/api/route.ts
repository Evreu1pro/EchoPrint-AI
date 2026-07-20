import { NextResponse } from "next/server";

/** Health / module index */
export async function GET() {
  return NextResponse.json({
    name: "EchoPrint AI",
    modules: {
      fp: {
        id: 1,
        path: "/api/fp",
        methods: ["GET", "POST"],
        description:
          "M1 Network: IP intel (ASN/type/VPN), JA3/JA4 headers, header order, WebRTC vs HTTP, geo↔tz",
      },
      "network-detective": {
        id: "1-legacy",
        path: "/api/network",
        methods: ["GET", "POST"],
        description: "Legacy network detective (headers snapshot)",
      },
    },
  });
}