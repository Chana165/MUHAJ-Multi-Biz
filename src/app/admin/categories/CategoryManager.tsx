"use client";

import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  FolderTree,
  Package,
  Plus,
  Power,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createCategory,
  deleteCategory,
  toggleCategory,
  updateCategory,
  type CategoryActionResult,
} from "./actions";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

type Props = {
  initialCategories: Category[];
};

type ModalMode = "create" | "edit" | null;

export default function CategoryManager({ initialCategories }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [categories, setCategories] =
    useState<Category[]>(initialCategories);

  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(
    null
  );

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSortOrder, setFormSortOrder] = useState("0");
  const [formActive, setFormActive] = useState(true);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return categories;
    }

    return categories.filter(
      (category) =>
        category.name.toLowerCase().includes(query) ||
        category.slug.toLowerCase().includes(query) ||
        (category.description ?? "").toLowerCase().includes(query)
    );
  }, [categories, search]);

  const activeCategories = categories.filter(
    (category) => category.is_active
  ).length;

  const inactiveCategories = categories.length - activeCategories;

  function openCreateModal() {
    setEditingCategory(null);
    setFormName("");
    setFormDescription("");
    setFormSortOrder(String(categories.length));
    setFormActive(true);
    setMessage(null);
    setModalMode("create");
  }

  function openEditModal(category: Category) {
    setEditingCategory(category);
    setFormName(category.name);
    setFormDescription(category.description ?? "");
    setFormSortOrder(String(category.sort_order));
    setFormActive(category.is_active);
    setMessage(null);
    setModalMode("edit");
  }

  function closeModal() {
    if (isPending) {
      return;
    }

    setModalMode(null);
    setEditingCategory(null);
  }

  function handleResult(result: CategoryActionResult) {
    setMessage({
      type: result.ok ? "success" : "error",
      text: result.message,
    });

    if (result.ok) {
      setModalMode(null);
      setEditingCategory(null);
      router.refresh();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result =
        modalMode === "edit"
          ? await updateCategory(formData)
          : await createCategory(formData);

      handleResult(result);
    });
  }

  function handleToggle(category: Category) {
    startTransition(async () => {
      const result = await toggleCategory(
        category.id,
        !category.is_active
      );

      if (result.ok) {
        setCategories((current) =>
          current.map((item) =>
            item.id === category.id
              ? { ...item, is_active: !item.is_active }
              : item
          )
        );
      }

      handleResult(result);
    });
  }

  function handleDelete(category: Category) {
    const confirmed = window.confirm(
      `Delete "${category.name}"?\n\nCategories with assigned products cannot be deleted.`
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      const result = await deleteCategory(category.id);

      if (result.ok) {
        setCategories((current) =>
          current.filter((item) => item.id !== category.id)
        );
      }

      handleResult(result);
    });
  }

  return (
    <div className="admin-module-page space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#071a3a] text-[#d4af37]">
              <FolderTree className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b28b16]">
                Product organization
              </p>

              <h1 className="text-2xl font-black tracking-tight text-[#071a3a] sm:text-3xl">
                Categories
              </h1>
            </div>
          </div>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Organize the MUHAJ catalog into clear product categories.
            Categories created here are available directly in Product
            Management.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#071a3a] px-5 py-3 text-sm font-bold text-[#d4af37] transition hover:bg-[#102b58] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {/* Feedback */}
      {message && (
        <div
          className={`flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          )}

          <p className="flex-1 font-medium">{message.text}</p>

          <button
            type="button"
            onClick={() => setMessage(null)}
            className="rounded-lg p-1 transition hover:bg-black/5"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Categories
              </p>
              <p className="mt-2 text-3xl font-black text-[#071a3a]">
                {categories.length}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#071a3a]/5 text-[#071a3a]">
              <FolderTree className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Active Categories
              </p>
              <p className="mt-2 text-3xl font-black text-emerald-700">
                {activeCategories}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Power className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Inactive Categories
              </p>
              <p className="mt-2 text-3xl font-black text-slate-700">
                {inactiveCategories}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Power className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Search / list */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-black text-[#071a3a]">
              Category List
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredCategories.length} categor
              {filteredCategories.length === 1 ? "y" : "ies"} shown
            </p>
          </div>

          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search categories..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#d4af37] focus:bg-white focus:ring-2 focus:ring-[#d4af37]/20"
            />
          </div>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Search className="h-6 w-6" />
            </div>

            <h3 className="mt-4 text-base font-bold text-[#071a3a]">
              No categories found
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Try another search term or create a new category.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[820px]">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Category
                    </th>
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Slug
                    </th>
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Order
                    </th>
                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCategories.map((category) => (
                    <tr
                      key={category.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#071a3a] text-sm font-black text-[#d4af37]">
                            {category.name.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <p className="font-bold text-[#071a3a]">
                              {category.name}
                            </p>

                            <p className="mt-1 max-w-md truncate text-xs text-slate-500">
                              {category.description ||
                                "No description added"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {category.slug}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                        {category.sort_order}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggle(category)}
                          disabled={isPending}
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                            category.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              category.is_active
                                ? "bg-emerald-500"
                                : "bg-slate-400"
                            }`}
                          />

                          {category.is_active ? "Active" : "Inactive"}
                        </button>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(category)}
                            disabled={isPending}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-[#d4af37] hover:text-[#071a3a]"
                          >
                            <Edit3 className="h-4 w-4" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(category)}
                            disabled={isPending}
                            className="inline-flex items-center justify-center rounded-lg border border-red-100 p-2 text-red-600 transition hover:bg-red-50"
                            aria-label={`Delete ${category.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/tablet cards */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {filteredCategories.map((category) => (
                <article key={category.id} className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#071a3a] text-sm font-black text-[#d4af37]">
                      {category.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-[#071a3a]">
                          {category.name}
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                            category.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {category.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <p className="mt-1 break-all text-xs text-slate-400">
                        {category.slug}
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {category.description ||
                          "No description added for this category."}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                          <Package className="h-3.5 w-3.5" />
                          Sort: {category.sort_order}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleToggle(category)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
                        >
                          <Power className="h-3.5 w-3.5" />
                          {category.is_active ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(category)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(category)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#071a3a]/50 p-0 backdrop-blur-sm sm:items-center sm:p-5">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-xl sm:rounded-3xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#b28b16]">
                  Catalog
                </p>

                <h2 className="mt-1 text-xl font-black text-[#071a3a]">
                  {modalMode === "edit"
                    ? "Edit Category"
                    : "Add Category"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
              {modalMode === "edit" && editingCategory && (
                <input
                  type="hidden"
                  name="id"
                  value={editingCategory.id}
                />
              )}

              <div>
                <label
                  htmlFor="category-name"
                  className="mb-2 block text-sm font-bold text-[#071a3a]"
                >
                  Category Name
                </label>

                <input
                  id="category-name"
                  name="name"
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                  required
                  maxLength={80}
                  placeholder="e.g. Fashion"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#d4af37] focus:bg-white focus:ring-2 focus:ring-[#d4af37]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="category-description"
                  className="mb-2 block text-sm font-bold text-[#071a3a]"
                >
                  Description
                </label>

                <textarea
                  id="category-description"
                  name="description"
                  value={formDescription}
                  onChange={(event) =>
                    setFormDescription(event.target.value)
                  }
                  rows={4}
                  placeholder="Briefly describe what belongs in this category."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#d4af37] focus:bg-white focus:ring-2 focus:ring-[#d4af37]/20"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="category-sort-order"
                    className="mb-2 block text-sm font-bold text-[#071a3a]"
                  >
                    Sort Order
                  </label>

                  <input
                    id="category-sort-order"
                    name="sort_order"
                    type="number"
                    min="0"
                    value={formSortOrder}
                    onChange={(event) =>
                      setFormSortOrder(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#d4af37] focus:bg-white focus:ring-2 focus:ring-[#d4af37]/20"
                  />

                  <p className="mt-2 text-xs text-slate-400">
                    Lower numbers appear first.
                  </p>
                </div>

                <div className="flex items-end">
                  <label className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-[#071a3a]">
                        Active
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Available for customers
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formActive}
                      onChange={(event) =>
                        setFormActive(event.target.checked)
                      }
                      className="h-5 w-5 accent-[#071a3a]"
                    />
                  </label>
                </div>
              </div>

              {message?.type === "error" && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {message.text}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isPending}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-[#071a3a] px-5 py-3 text-sm font-bold text-[#d4af37] transition hover:bg-[#102b58] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending
                    ? "Saving..."
                    : modalMode === "edit"
                      ? "Save Changes"
                      : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}