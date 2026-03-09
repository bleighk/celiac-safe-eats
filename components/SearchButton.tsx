"use client";

interface SearchButtonProps {
  onSearch: () => void;
  isLoading: boolean;
  disabled: boolean;
}

export default function SearchButton({
  onSearch,
  isLoading,
  disabled,
}: SearchButtonProps) {
  return (
    <button
      onClick={onSearch}
      disabled={disabled || isLoading}
      className="fixed bottom-6 left-1/2 z-[1000] flex h-14 -translate-x-1/2 items-center gap-2 rounded-full bg-green-600 px-8 text-lg font-semibold text-white shadow-xl transition-all hover:bg-green-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isLoading ? (
        <>
          <svg
            className="h-5 w-5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          Searching...
        </>
      ) : (
        "Find Safe Restaurants"
      )}
    </button>
  );
}
