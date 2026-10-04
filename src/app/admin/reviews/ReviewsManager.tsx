"use client";

import {
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Filter,
  MessageSquare,
  Search,
  Star,
  Trash2,
  X,
  XCircle,
  Clock3,
} from "lucide-react";

import {
  deleteReview,
  updateReviewStatus,
  type Review,
} from "./actions";

type Props = {
  initialReviews: Review[];
  loadError?: string;
};

const statusOptions = [
  "all",
  "pending",
  "approved",
  "rejected",
] as const;

const ratingOptions = [
  "all",
  "5",
  "4",
  "3",
  "2",
  "1",
] as const;

type StatusFilter = (typeof statusOptions)[number];
type RatingFilter = (typeof ratingOptions)[number];

function date(value: string | null) {
  if (!value) return "—";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function statusLabel(status: string) {
  const s = normalize(status);

  if (s === "approved") return "Approved";
  if (s === "rejected") return "Rejected";
  if (s === "pending") return "Pending";

  return s
    ? s.charAt(0).toUpperCase() + s.slice(1)
    : "Pending";
}

function statusClass(status: string) {
  switch (normalize(status)) {
    case "approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "rejected":
      return "border-red-200 bg-red-50 text-red-700";

    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-700";

    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function StatusIcon({
  status,
}: {
  status: string;
}) {
  switch (normalize(status)) {
    case "approved":
      return (
        <CheckCircle2 className="h-4 w-4" />
      );

    case "rejected":
      return <XCircle className="h-4 w-4" />;

    default:
      return <Clock3 className="h-4 w-4" />;
  }
}

function Stars({
  rating,
}: {
  rating: number;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-slate-300"
          }`}
        />
      ))}
    </div>
  );
}

export default function ReviewsManager({
  initialReviews,
  loadError,
}: Props) {
  const [reviews, setReviews] =
    useState(initialReviews);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");
  const [ratingFilter, setRatingFilter] =
    useState<RatingFilter>("all");

  const [selected, setSelected] =
    useState<Review | null>(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] =
    useTransition();

  const stats = useMemo(() => {
    const total = reviews.length;

    const pendingCount = reviews.filter(
      (item) =>
        normalize(item.status) === "pending"
    ).length;

    const approved = reviews.filter(
      (item) =>
        normalize(item.status) === "approved"
    ).length;

    const fiveStars = reviews.filter(
      (item) => item.rating === 5
    ).length;

    const lowRatings = reviews.filter(
      (item) => item.rating <= 2
    ).length;

    const average =
      total === 0
        ? 0
        : reviews.reduce(
            (sum, item) =>
              sum + item.rating,
            0
          ) / total;

    return {
      total,
      pending: pendingCount,
      approved,
      fiveStars,
      lowRatings,
      average,
    };
  }, [reviews]);

  const filtered = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return reviews.filter((review) => {
      const matchesStatus =
        statusFilter === "all" ||
        normalize(review.status) ===
          statusFilter;

      const matchesRating =
        ratingFilter === "all" ||
        String(review.rating) ===
          ratingFilter;

      if (!matchesStatus || !matchesRating) {
        return false;
      }

      if (!query) return true;

      return [
        review.customerName,
        review.customerEmail,
        review.productName,
        review.title,
        review.comment,
        review.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [
    reviews,
    search,
    statusFilter,
    ratingFilter,
  ]);

  function changeStatus(
    review: Review,
    status: string
  ) {
    setError("");
    setMessage("");

    startTransition(async () => {
      const result =
        await updateReviewStatus(
          review.id,
          status
        );

      if (!result.success) {
        setError(
          result.error ??
            "Unable to update review."
        );
        return;
      }

      setReviews((items) =>
        items.map((item) =>
          item.id === review.id
            ? { ...item, status }
            : item
        )
      );

      setSelected((item) =>
        item?.id === review.id
          ? { ...item, status }
          : item
      );

      setMessage(
        `Review marked as ${status}.`
      );
    });
  }

  function removeReview(review: Review) {
    const ok = window.confirm(
      `Delete this review from ${review.customerName}?`
    );

    if (!ok) return;

    setError("");
    setMessage("");

    startTransition(async () => {
      const result =
        await deleteReview(review.id);

      if (!result.success) {
        setError(
          result.error ??
            "Unable to delete review."
        );
        return;
      }

      setReviews((items) =>
        items.filter(
          (item) => item.id !== review.id
        )
      );

      setSelected((item) =>
        item?.id === review.id
          ? null
          : item
      );

      setMessage(
        "Review deleted successfully."
      );
    });
  }

  return (
    <div className="admin-module-page space-y-6">
      <div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Review Management
        </h1>
      </div>

      {(loadError || error || message) ? (
        <div
          className={`flex gap-3 rounded-2xl border p-4 text-sm ${
            loadError || error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          <AlertCircle className="h-5 w-5 shrink-0" />

          <div>
            <p className="font-semibold">
              {loadError || error
                ? "Reviews notice"
                : "Reviews update"}
            </p>

            <p className="mt-1">
              {loadError || error || message}
            </p>
          </div>

          {!pending ? (
            <button
              type="button"
              onClick={() => {
                setError("");
                setMessage("");
              }}
              className="ml-auto text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-medium text-slate-500">
            Total Reviews
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {stats.total}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-medium text-slate-500">
            Pending
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {stats.pending}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-medium text-slate-500">
            Approved
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {stats.approved}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-medium text-slate-500">
            5-Star Reviews
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-950">
            {stats.fiveStars}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-medium text-slate-500">
            Average Rating
          </p>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-3xl font-bold text-slate-950">
              {stats.average.toFixed(1)}
            </p>
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Customer Reviews
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {filtered.length} review
                {filtered.length === 1
                  ? ""
                  : "s"} shown
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative sm:w-[280px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search reviews..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as StatusFilter
                    )
                  }
                  className="h-11 min-w-[150px] appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-8 text-sm font-medium text-slate-700 outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
                >
                  <option value="all">
                    All Status
                  </option>
                  <option value="pending">
                    Pending
                  </option>
                  <option value="approved">
                    Approved
                  </option>
                  <option value="rejected">
                    Rejected
                  </option>
                </select>
              </div>

              <select
                value={ratingFilter}
                onChange={(e) =>
                  setRatingFilter(
                    e.target.value as RatingFilter
                  )
                }
                className="h-11 min-w-[140px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-[#061a3a] focus:ring-2 focus:ring-[#061a3a]/10"
              >
                <option value="all">
                  All Ratings
                </option>
                <option value="5">
                  5 Stars
                </option>
                <option value="4">
                  4 Stars
                </option>
                <option value="3">
                  3 Stars
                </option>
                <option value="2">
                  2 Stars
                </option>
                <option value="1">
                  1 Star
                </option>
              </select>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center sm:px-6">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <MessageSquare className="h-6 w-6" />
            </div>

            <h3 className="mt-4 font-bold text-slate-950">
              No reviews found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Customer reviews will appear here after customers
              submit feedback on products.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1050px]">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-6 py-4">
                      Customer
                    </th>

                    <th className="px-4 py-4">
                      Product
                    </th>

                    <th className="px-4 py-4">
                      Rating
                    </th>

                    <th className="px-4 py-4">
                      Review
                    </th>

                    <th className="px-4 py-4">
                      Status
                    </th>

                    <th className="px-4 py-4">
                      Date
                    </th>

                    <th className="px-6 py-4 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filtered.map((review) => (
                    <tr
                      key={review.id}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="px-6 py-5">
                        <p className="font-semibold text-slate-900">
                          {review.customerName}
                        </p>

                        <p className="mt-1 max-w-[180px] truncate text-xs text-slate-500">
                          {review.customerEmail}
                        </p>
                      </td>

                      <td className="px-4 py-5">
                        <p className="max-w-[180px] truncate font-medium text-slate-800">
                          {review.productName}
                        </p>
                      </td>

                      <td className="px-4 py-5">
                        <div className="flex items-center gap-2">
                          <Stars rating={review.rating} />
                          <span className="text-xs font-semibold text-slate-500">
                            {review.rating}/5
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-5">
                        <p className="max-w-[220px] truncate font-semibold text-slate-800">
                          {review.title || "Customer review"}
                        </p>

                        <p className="mt-1 max-w-[260px] truncate text-xs text-slate-500">
                          {review.comment || "No comment"}
                        </p>
                      </td>

                      <td className="px-4 py-5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClass(
                            review.status
                          )}`}
                        >
                          <StatusIcon
                            status={review.status}
                          />
                          {statusLabel(
                            review.status
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-5 text-sm text-slate-600">
                        {date(review.createdAt)}
                      </td>

                      <td className="px-6 py-5 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setSelected(review)
                          }
                          className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 lg:hidden">
              {filtered.map((review) => (
                <div
                  key={review.id}
                  className="p-5 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-slate-950">
                        {review.customerName}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {review.productName}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClass(
                        review.status
                      )}`}
                    >
                      <StatusIcon
                        status={review.status}
                      />
                      {statusLabel(review.status)}
                    </span>
                  </div>

                  <div className="mt-4">
                    <Stars rating={review.rating} />
                  </div>

                  <p className="mt-3 font-semibold text-slate-900">
                    {review.title ||
                      "Customer review"}
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {review.comment ||
                      "No comment"}
                  </p>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {date(review.createdAt)}
                    </span>

                    <span>
                      {review.rating}/5
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelected(review)
                    }
                    className="mt-5 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Eye className="h-4 w-4" />
                    View Review
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 sm:px-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-700">
                  Review Details
                </p>

                <h3 className="mt-1 text-xl font-bold text-slate-950">
                  {selected.productName}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 px-5 py-6 sm:px-6">
              <div className="flex flex-wrap items-center gap-3">
                <Stars rating={selected.rating} />

                <span className="text-sm font-bold text-slate-700">
                  {selected.rating}/5
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${statusClass(
                    selected.status
                  )}`}
                >
                  <StatusIcon
                    status={selected.status}
                  />
                  {statusLabel(
                    selected.status
                  )}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Customer
                  </p>

                  <p className="mt-2 font-semibold text-slate-900">
                    {selected.customerName}
                  </p>

                  <p className="mt-1 break-all text-sm text-slate-500">
                    {selected.customerEmail}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Product
                  </p>

                  <p className="mt-2 font-semibold text-slate-900">
                    {selected.productName}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Review
                </p>

                <h4 className="mt-2 text-lg font-bold text-slate-950">
                  {selected.title ||
                    "Customer Review"}
                </h4>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                  {selected.comment ||
                    "No comment provided."}
                </p>

                <p className="mt-4 text-xs text-slate-400">
                  Submitted {date(selected.createdAt)}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-950">
                  Moderation
                </h4>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    "pending",
                    "approved",
                    "rejected",
                  ].map((status) => {
                    const active =
                      normalize(
                        selected.status
                      ) === status;

                    return (
                      <button
                        key={status}
                        type="button"
                        disabled={
                          pending || active
                        }
                        onClick={() =>
                          changeStatus(
                            selected,
                            status
                          )
                        }
                        className={`flex h-11 items-center justify-center rounded-xl border text-sm font-semibold capitalize ${
                          active
                            ? "border-[#061a3a] bg-[#061a3a] text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-between sm:px-6">
              <button
                type="button"
                onClick={() =>
                  removeReview(selected)
                }
                disabled={pending}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete Review
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelected(null)
                }
                className="h-10 rounded-xl bg-[#061a3a] px-5 text-sm font-semibold text-white hover:bg-[#0a2857]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}