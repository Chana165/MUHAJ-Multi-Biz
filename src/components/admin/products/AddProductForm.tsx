"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ImagePlus, Loader2, X } from "lucide-react";

type Category = {
  id: string;
  name: string;
};

type SelectedImage = {
  file: File;
  preview: string;
};

export default function AddProductForm() {
  const router = useRouter();
  const supabase = createClient();

  const [categories, setCategories] = useState<Category[]>([]);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stock, setStock] = useState("");
  const [featured, setFeatured] = useState(false);

  const [images, setImages] = useState<SelectedImage[]>([]);

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order");

      setCategories(data ?? []);
      setLoadingCategories(false);
    }

    void loadCategories();
  }, [supabase]);

  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files ?? []);

    const newImages = files
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));

    setImages((current) => [...current, ...newImages]);
  }

  function removeImage(index: number) {
    setImages((current) => {
      const image = current[index];

      if (image) {
        URL.revokeObjectURL(image.preview);
      }

      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function createSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
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

      const slug = createSlug(name);

      const { data: existingSlug } = await supabase
        .from("products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (existingSlug) {
        throw new Error(
          "A product with this name already exists. Choose another name.",
        );
      }

      const { data: product, error: productError } =
        await supabase
          .from("products")
          .insert({
            name: name.trim(),
            slug,
            category_id: categoryId,
            sku: sku.trim() || null,
            description: description.trim() || null,
            price: Number(price),
            sale_price: salePrice ? Number(salePrice) : null,
            stock: Number(stock || 0),
            status: "active",
            featured,
          })
          .select()
          .single();

      if (productError || !product) {
        throw new Error(
          productError?.message || "Unable to create product.",
        );
      }

      for (let index = 0; index < images.length; index++) {
        const selected = images[index];

        const extension =
          selected.file.name.split(".").pop()?.toLowerCase() || "jpg";

        const storagePath =
          `${product.id}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(storagePath, selected.file, {
            contentType: selected.file.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(
            `Image upload failed: ${uploadError.message}`,
          );
        }

        const {
          data: publicUrlData,
        } = supabase.storage
          .from("product-images")
          .getPublicUrl(storagePath);

        const { error: imageError } = await supabase
          .from("product_images")
          .insert({
            product_id: product.id,
            image_url: publicUrlData.publicUrl,
            storage_path: storagePath,
            alt_text: product.name,
            is_primary: index === 0,
            sort_order: index + 1,
          });

        if (imageError) {
          throw new Error(
            `Image record failed: ${imageError.message}`,
          );
        }
      }

      router.push("/admin/products");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8"
    >
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
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
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Ladies Handbag"
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
              disabled={loadingCategories}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900"
            >
              <option value="">
                {loadingCategories
                  ? "Loading categories..."
                  : "Select category"}
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
              onChange={(event) => setSku(event.target.value)}
              placeholder="Optional SKU"
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
              onChange={(event) => setPrice(event.target.value)}
              placeholder="25000"
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
              onChange={(event) => setStock(event.target.value)}
              placeholder="10"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
            />
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
              placeholder="Describe the product..."
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
              Feature this product
            </span>
          </label>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Product Images
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Upload product images from your computer. The first image
          becomes the main product image.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {images.map((image, index) => (
            <div
              key={image.preview}
              className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
            >
              <img
                src={image.preview}
                alt={`Product preview ${index + 1}`}
                className="aspect-square w-full object-cover"
              />

              {index === 0 && (
                <span className="absolute left-3 top-3 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-slate-950">
                  Main Image
                </span>
              )}

              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute right-3 top-3 rounded-full bg-slate-950/80 p-2 text-white"
                aria-label={`Remove image ${index + 1}`}
              >
                <X size={15} />
              </button>
            </div>
          ))}

          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-center transition hover:border-amber-400 hover:bg-amber-50">
            <ImagePlus className="text-amber-600" size={32} />

            <span className="mt-3 text-sm font-bold text-slate-700">
              Upload Images
            </span>

            <span className="mt-1 px-4 text-xs text-slate-400">
              JPG, PNG or WEBP
            </span>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 font-bold text-white disabled:opacity-60"
        >
          {saving && <Loader2 className="animate-spin" size={18} />}

          {saving ? "Saving Product..." : "Save Product"}
        </button>
      </div>
    </form>
  );
}
