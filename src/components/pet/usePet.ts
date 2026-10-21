import { createContext, useContext } from 'react';

export type PetApi = {
  /** Собачка радуется (подпрыгивает и говорит реплику) — например, когда дело выполнено. */
  cheer: (text?: string) => void;
};

export const PetContext = createContext<PetApi>({ cheer: () => {} });

export function usePet(): PetApi {
  return useContext(PetContext);
}
