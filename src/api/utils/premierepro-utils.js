import { premierepro } from "../../globals";

export const asTransaction = async (
  proj,
  actions,
  description,
) => {
  proj.executeTransaction(async (compAction) => {
    for (const action of actions) {
      compAction.addAction(action);
    }
  }, description);
};

export const lockedTransaction = async (
  proj,
  actions,
  description,
) => {
  proj.lockedAccess(() =>
    proj.executeTransaction(async (compAction) => {
      for (const action of actions) {
        compAction.addAction(action);
      }
    }, description),
  );
};
