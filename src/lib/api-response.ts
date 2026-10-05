import { NextResponse } from "next/server";

export const successResponse = async <T>(
  message: string,
  data: T,
  status = 200,
)=> {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      error: null,
    },
    { status },
  );
}

export const errorResponse = async(
  message: string,
  error?: unknown,
  status = 400,
) => {
  return NextResponse.json(
    {
      success: false,
      message,
      data: null,
      error: error ?? null,
    },
    { status },
  );
}