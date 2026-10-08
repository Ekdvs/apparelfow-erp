export const inputCls =
  "block w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-700";

export const inputErrCls = "!border-red-600 focus:!ring-red-600/30";

const btnBase =
  "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-700";

export const btnPrimary = `${btnBase} bg-blue-700 text-white hover:bg-blue-800 focus:ring-blue-700/40`;
export const btnSuccess = `${btnBase} bg-green-700 text-white hover:bg-green-800 focus:ring-green-700/40`;
export const btnDanger = `${btnBase} bg-red-700 text-white hover:bg-red-800 focus:ring-red-700/40`;
export const btnSecondary = `${btnBase} border border-gray-400 bg-white text-gray-900 hover:bg-gray-100 focus:ring-gray-500/40 disabled:border-gray-300`;