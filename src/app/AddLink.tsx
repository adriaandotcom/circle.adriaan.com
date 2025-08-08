"use client";
import { api } from "@/trpc/react";

export const AddLink = ({ a, b }: { a: string; b: string }) => {
  const create = api.link.create.useMutation();
  return (
    <button onClick={async () => { await create.mutateAsync({ nodeIds: [a, b] }); }}>
      Link nodes
    </button>
  );
};
