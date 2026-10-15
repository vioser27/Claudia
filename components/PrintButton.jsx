"use client";

export default function PrintButton({ className = "primary small", children = "Download PDF" }) {
  return (
    <button className={className} onClick={() => window.print()}>
      {children}
    </button>
  );
}
