"use client";

import {
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlus,
  Loader2,
  Star,
  Trash2,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Category = {
  id: string;
  name: string;
};

type ExistingImage = {
  id: string;
  image_url: string;
  storage_path: string | null;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
};

interface ProductData {
  id: string;
  name: string;
  category_id: string | null;
  sku: string | null;
  description: string | null;
  price: number;
  sale_price: number | null;
  stock: number;
  status: "draft" | "active" | "archived";
  featured: boolean;
}

interface EditProductFormProps {
  product: ProductData;
  categories: Category[];
  initialImages: ExistingImage[];
}

type NewImage = {
  file: File;
  preview: string;
};

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function EditProductForm({
  product,
  categories,
  initialImages,
}: EditProductFormProps) {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [name, setName] = useState(product.name);
  const [categoryId, setCategoryId] = useState(
    product.category_id ?? "",
  );
  const [sku, setSku] = useState(product.sku ?? "");
  const [description, setDescription] = useState(
    product.description ?? "",
  );
  const [price, setPrice] = useState(String(product.price));
  const [salePrice, setSalePrice] = useState(
    product.sale_price === null
      ? ""
      : String(product.sale_price),
  );
  const [stock, setStock] = useState(String(product.stock));
  const [status, setStatus] =
    useState<ProductData["status"]>(product.status);
  const [featured, setFeatured] = useState(product.featured);

  const [images, setImages] =
    useState<ExistingImage[]>(initialImages);

  const [newImages, setNewImages] = useState<NewImage[]>([]);

  const [saving, setSaving] = useState(false);
  const [imageAction, setImageAction] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleNewImages(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files ?? []);

    const selected = files
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

    setNewImages((current) => [...current, ...selected]);

    event.target.value = "";
  }

  function removeNewImage(index: number) {
    setNewImages((current) => {
      const item = current[index];

      if (item) {
        URL.revokeObjectURL(item.preview);
      }

      return current.filter(
        (_, itemIndex) => itemIndex !== index,
      );
    });
  }

  async function deleteImage(image: ExistingImage) {
    setError("");
    setImageAction(true);

    try {
      if (image.storage_path) {
        const { error: storageError } =
          await supabase.storage
            .from("product-images")
            .remove([image.storage_path]);

        if (storageError) {
          throw new Error(storageError.message);
        }
      }

      const { error: databaseError } = await supabase
        .from("product_images")
        .delete()
        .eq("id", image.id);

      if (databaseError) {
        throw new Error(databaseError.message);
      }

      const remaining = images.filter(
        (item) => item.id !== image.id,
      );

      setImages(
        remaining.map((item, index) => ({
          ...item,
          is_primary:
            remaining.some((entry) => entry.is_primary)
              ? item.is_primary
              : index === 0,
          sort_order: index + 1,
        })),
      );

      if (
        image.is_primary &&
        remaining.length > 0
      ) {
        const newPrimary =
          remaining[0];

        await supabase
          .from("product_images")
          .update({
            is_primary: true,
            sort_order: 1,
          })
          .eq("id", newPrimary.id);
      }

      setMessage("Image removed.");
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to remove image.",
      );
    } finally {
      setImageAction(false);
    }
  }

  async function makePrimary(imageId: string) {
    setError("");
    setImageAction(true);

    try {
      const { error: clearError } = await supabase
        .from("product_images")
        .update({ is_primary: false })
        .eq("product_id", product.id);

      if (clearError) {
        throw new Error(clearError.message);
      }

      const { error: setErrorResult } =
        await supabase
          .from("product_images")
          .update({
            is_primary: true,
          })
          .eq("id", imageId);

      if (setErrorResult) {
        throw new Error(setErrorResult.message);
      }

      setImages((current) =>
        current.map((image) => ({
          ...image,
          is_primary: image.id === imageId,
        })),
      );

      setMessage("Main image updated.");
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Unable to update main image.",
      );
    } finally {
      setImageAction(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");
    setSaving(true);

    try {
      if (!name.trim()) {
        throw new Error("Product name is required.");
      }

      if (!categoryId) {
        throw new Error("Please select a category.");
      }

      if (!price || Number(price) < 0) {
        throw new Error("Please enter a valid price.");
      }

      const slug = makeSlug(name);

      const { data: conflictingProduct } =
        await supabase
          .from("products")
          .select("id")
          .eq("slug", slug)
          .neq("id", product.id)
          .maybeSingle();

      if (conflictingProduct) {
        throw new Error(
          "Another product already uses this name.",
        );
      }

      const { error: updateError } =
        await supabase
          .from("products")
          .update({
            name: name.trim(),
            slug,
            category_id: categoryId,
            sku: sku.trim() || null,
            description: description.trim() || null,
            price: Number(price),
            sale_price: salePrice
              ? Number(salePrice)
              : null,
            stock: Number(stock || 0),
            status,
            featured,
            updated_at: new Date().toISOString(),
          })
          .eq("id", product.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      for (
        let index = 0;
        index < newImages.length;
        index++
      ) {
        const selected = newImages[index];

        const extension =
          selected.file.name
            .split(".")
            .pop()
            ?.toLowerCase() || "jpg";

        const storagePath =
          `${product.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } =
          await supabase.storage
            .from("product-images")
            .upload(
              storagePath,
              selected.file,
              {
                contentType: selected.file.type,
                upsert: false,
              },
            );

        if (uploadError) {
          throw new Error(
            `Image upload failed: ${uploadError.message}`,
          );
        }

        const publicUrl =
          supabase.storage
            .from("product-images")
            .getPublicUrl(storagePath)
            .data.publicUrl;

        const isFirstImage =
          images.length === 0 &&
          index === 0;

        const { error: imageError } =
          await supabase
            .from("product_images")
            .insert({
              product_id: product.id,
              image_url: publicUrl,
              storage_path: storagePath,
              alt_text: name.trim(),
              is_primary: isFirstImage,
              sort_order:
                images.length + index + 1,
            });

        if (imageError) {
          throw new Error(
            `Image record failed: ${imageError.message}`,
          );
        }
      }

      setNewImages([]);
      setMessage("Product updated successfully.");

      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to update product.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-7"
    >
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">
          Product Information
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Product Name *
            </label>

            <input
              required
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Category *
            </label>

            <select
              required
              value={categoryId}
              onChange={(event) =>
                setCategoryId(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
            >
              <option value="">
                Select category
              </option>

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              SKU
            </label>

            <input
              value={sku}
              onChange={(event) =>
                setSku(event.target.value)
              }
              placeholder="Optional"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Price (₦) *
            </label>

            <input
              required
              min="0"
              type="number"
              value={price}
              onChange={(event) =>
                setPrice(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Sale Price (₦)
            </label>

            <input
              min="0"
              type="number"
              value={salePrice}
              onChange={(event) =>
                setSalePrice(event.target.value)
              }
              placeholder="Optional"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Stock *
            </label>

            <input
              required
              min="0"
              type="number"
              value={stock}
              onChange={(event) =>
                setStock(event.target.value)
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Status
            </label>

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target.value as ProductData["status"],
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Description
            </label>

            <textarea
              rows={6}
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={featured}
              onChange={(event) =>
                setFeatured(event.target.checked)
              }
              className="h-4 w-4 accent-amber-500"
            />

            <span className="text-sm font-semibold text-slate-700">
              Featured Product
            </span>
          </label>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Product Images
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Set a main image or remove an existing image.
            </p>
          </div>

          {imageAction && (
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Loader2
                className="animate-spin"
                size={15}
              />
              Updating images...
            </span>
          )}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.image_url}
                alt={image.alt_text ?? name}
                className="aspect-square w-full object-cover"
              />

              {image.is_primary && (
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-slate-950">
                  <Star size={12} fill="currentColor" />
                  Main
                </span>
              )}

              <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                {!image.is_primary && (
                  <button
                    type="button"
                    onClick={() =>
                      void makePrimary(image.id)
                    }
                    disabled={imageAction}
                    className="flex-1 rounded-lg bg-slate-900/90 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Set Main
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    void deleteImage(image)
                  }
                  disabled={imageAction}
                  className="rounded-lg bg-red-600/90 p-2 text-white disabled:opacity-50"
                  aria-label={`Delete ${name} image`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}

          {newImages.map((image, index) => (
            <div
              key={image.preview}
              className="relative overflow-hidden rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.preview}
                alt={`New product preview ${index + 1}`}
                className="aspect-square w-full object-cover"
              />

              <span className="absolute left-3 top-3 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                New
              </span>

              <button
                type="button"
                onClick={() =>
                  removeNewImage(index)
                }
                className="absolute right-3 top-3 rounded-full bg-slate-950/80 p-2 text-white"
                aria-label="Remove selected image"
              >
                <X size={15} />
              </button>
            </div>
          ))}

          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-center transition hover:border-amber-400 hover:bg-amber-50">
            <ImagePlus
              className="text-amber-600"
              size={32}
            />

            <span className="mt-3 text-sm font-bold text-slate-700">
              Add Images
            </span>

            <span className="mt-1 px-4 text-xs text-slate-400">
              JPG, PNG or WEBP
            </span>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleNewImages}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {(message || error) && (
        <div
          className={
            error
              ? "rounded-xl bg-red-50 p-4 text-sm text-red-700"
              : "rounded-xl bg-green-50 p-4 text-sm text-green-700"
          }
        >
          {error || message}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-bold text-white disabled:opacity-60"
        >
          {saving && (
            <Loader2
              className="animate-spin"
              size={18}
            />
          )}

          {saving
            ? "Saving Changes..."
            : "Save Changes"}
        </button>
      </div>
    </form>
  );
}