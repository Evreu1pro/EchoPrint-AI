import { NextResponse } from "next/server";

/** Health / module index */
export async function GET() {
  return NextResponse.json({
    name: "EchoPrint AI",
    modules: {
      "network-detective": {
        id: 1,
        path: "/api/network",
        methods: ["GET", "POST"],
        description:
          "Server-side network detective: IP, headers, proxy signals, Client Hints on the wire, client claim cross-check",
      },
    },
  });
}