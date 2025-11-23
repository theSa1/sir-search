import { assemblyList } from "@/lib/constants";
import { searchElector } from "@/lib/search-elector";
import { NextResponse } from "next/server";

export const GET = async (request: Request) => {
  const { searchParams } = new URL(request.url);
  console.log("Search Params:", searchParams.toString());
  const drpAC = searchParams.get("assembly") || "";
  const txtSearch = searchParams.get("name") || "";
  const txtSearchRelative = searchParams.get("relativeName") || "";

  try {
    if (
      !drpAC ||
      !assemblyList.includes(drpAC) ||
      !txtSearch ||
      !txtSearchRelative
    ) {
      return NextResponse.json({
        success: false,
        message:
          "Invalid query parameters. Please provide valid 'assembly', 'name', and 'relativeName'.",
      });
    }

    const result = await searchElector(drpAC, txtSearch, txtSearchRelative);

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: "An error occurred while processing your request.",
      error: (error as Error).message,
    });
  }
};
