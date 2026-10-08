"use client";

import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";
import Field from "@/components/Field";
import Modal from "@/components/Modal";
import { ordersApi, recipesApi } from "@/lib/api";
import { getErrorMessage } from "@/lib/axios";
import { btnPrimary, btnSecondary, inputCls, inputErrCls } from "@/lib/ui";
import { validatePositiveDecimal, validateWholeNumber } from "@/lib/validators";
import { Recipe } from "@/types";
import { LoadingButton } from "./Loader";

export default function CreateOrderModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [recipeId, setRecipeId] = useState("");
  const [qty, setQty] = useState("");
  const [roll, setRoll] = useState("");
  const [yards, setYards] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    recipesApi
      .list()
      .then(setRecipes)
      .catch((e) => toast.error(getErrorMessage(e)))
      .finally(() => setLoadingRecipes(false));
  }, []);

  const errors = {
    recipeId: recipeId ? null : "Select a recipe",
    qty: validateWholeNumber(qty, 1, 100000),
    roll: !roll.trim() ? "Fabric roll ID is required" : roll.trim().length > 50 ? "Max 50 characters" : null,
    yards: validatePositiveDecimal(yards),
  };
  const hasErrors = Object.values(errors).some(Boolean);
  const recipe = recipes.find((r) => r.id === recipeId);
  const qtyNum = errors.qty ? null : Number(qty);
  const touch = (k: string) => setTouched((t) => ({ ...t, [k]: true }));
  const show = (k: keyof typeof errors) => (touched[k] ? errors[k] : null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ recipeId: true, qty: true, roll: true, yards: true });
    if (hasErrors) return;
    setSubmitting(true);
    try {
      const o = await ordersApi.create({
        recipeId,
        targetQty: Number(qty),
        fabricRollId: roll.trim(),
        actualFabricYds: Number(yards),
      });
      toast.success(`Order ${o.orderNo} submitted for verification`);
      onCreated();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="New Cutting Order" onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Recipe" htmlFor="recipe" error={show("recipeId")}>
          <select
            id="recipe"
            className={`${inputCls} ${show("recipeId") ? inputErrCls : ""}`}
            value={recipeId}
            disabled={loadingRecipes}
            onChange={(e) => setRecipeId(e.target.value)}
            onBlur={() => touch("recipeId")}
          >
            <option value="">{loadingRecipes ? "Loading recipes…" : "Select a recipe"}</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.recipeCode})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Target batch quantity (garments)" htmlFor="qty" error={show("qty")}>
          <input
            id="qty"
            inputMode="numeric"
            className={`${inputCls} ${show("qty") ? inputErrCls : ""}`}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            onBlur={() => touch("qty")}
            placeholder="e.g. 50"
          />
        </Field>

        <Field label="Fabric roll ID" htmlFor="roll" error={show("roll")}>
          <input
            id="roll"
            className={`${inputCls} ${show("roll") ? inputErrCls : ""}`}
            value={roll}
            onChange={(e) => setRoll(e.target.value)}
            onBlur={() => touch("roll")}
            placeholder="e.g. FAB-ROLL-882"
          />
        </Field>

        <Field label="Actual fabric used (yards)" htmlFor="yards" error={show("yards")} hint="Decimals allowed (up to 2)">
          <input
            id="yards"
            inputMode="decimal"
            className={`${inputCls} ${show("yards") ? inputErrCls : ""}`}
            value={yards}
            onChange={(e) => setYards(e.target.value)}
            onBlur={() => touch("yards")}
            placeholder="e.g. 92"
          />
        </Field>

        {recipe && (
          <div className="rounded-md border border-gray-300 bg-gray-50 p-3 text-sm text-gray-900">
            <p className="mb-2 font-semibold">Expected component counts</p>
            <ul className="space-y-1">
              {recipe.components.map((c) => (
                <li key={c.id} className="flex justify-between">
                  <span>{c.componentName}</span>
                  <span className="font-semibold">
                    {qtyNum === null ? `${c.piecesPerGarment} per garment` : c.piecesPerGarment * qtyNum}
                  </span>
                </li>
              ))}
            </ul>
            {qtyNum !== null && (
              <p className="mt-2 text-xs text-gray-800">
                Expected fabric: {(recipe.stdFabricYards * qtyNum).toFixed(2)} yds · Wastage cap {recipe.wastageCap}%
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className={btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <LoadingButton type="submit" loading={submitting} loadingText="Submitting…" className={btnPrimary}>
            Submit for verification
          </LoadingButton>
        </div>
      </form>
    </Modal>
  );
}