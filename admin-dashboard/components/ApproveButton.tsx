'use client';

export default function ApproveButton({ id }: { id: number }) {
  return (
    <button
      onClick={() => console.log(`Approved application ${id}`)}
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-xs"
    >
      Approve
    </button>
  );
}

