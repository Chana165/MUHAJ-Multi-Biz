"use client";

import {
  CheckCircle2,
  Clock3,
  Eye,
  MessageSquareText,
  RefreshCw,
  Search,
  Star,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  deleteReview,
  updateReviewStatus,
  type AdminReview,
  type ReviewStatus,
} from "./actions";

type Props = {
  initialReviews: AdminReview[];
  loadError?: string;
};

type StatusFilter = "all" | ReviewStatus;

const statusOptions: Array<{
  value: StatusFilter;
  label: string;
}> = [
  {
    value: "all",
    label: "All Reviews",
  },
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "approved",
    label: "Approved",
  },
  {
    value: "rejected",
    label: "Rejected",
  },
];

const ratingOptions = [
  {
    value: "all",
    label: "All Ratings",
  },
  {
    value: "5",
    label: "5 Stars",
  },
  {
    value: "4",
    label: "4 Stars",
  },
  {
    value: "3",
    label: "3 Stars",
  },
  {
    value: "2",
    label: "2 Stars",
  },
  {
    value: "1",
    label: "1 Star",
  },
];

function statusClasses(status: ReviewStatus) {
  if (status === "approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function StatusIcon({
  status,
}: {
  status: ReviewStatus;
}) {
  if (status === "approved") {
    return <CheckCircle2 className="h-4 w-4" />;
  }

  if (status === "rejected") {
    return <XCircle className="h-4 w-4" />;
  }

  return <Clock3 className="h-4 w-4" />;
}

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function Stars({
  rating,
  small = false,
}: {
  rating: number;
  small?: boolean;
}) {
  const size = small
    ? "h-4 w-4"
    : "h-5 w-5";

  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map(
        (_, index) => (
          <Star
            key={index}
            className={`${size} ${
              index < rating
                ? "fill-amber-400 text-amber-400"
                : "text-slate-300"
            }`}
          />
        )
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  note,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  note?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">
            {value}
          </p>

          {note && (
            <p className="mt-1 text-xs text-slate-400">
              {note}
            </p>
          )}
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#061a3a] text-amber-300">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function ReviewsManager({
  initialReviews,
  loadError,
}: Props) {
  const [reviews, setReviews] =
    useState<AdminReview[]>(initialReviews);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");
  const [ratingFilter, setRatingFilter] =
    useState("all");

  const [selectedReview, setSelectedReview] =
    useState<AdminReview | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [pending, startTransition] =
    useTransition();

  const stats = useMemo(() => {
    const pendingCount = reviews.filter(
      (review) => review.status === "pending"
    ).length;

    const approvedCount = reviews.filter(
      (review) => review.status === "approved"
    ).length;

    const rejectedCount = reviews.filter(
      (review) => review.status === "rejected"
    ).length;

    const approvedReviews = reviews.filter(
      (review) => review.status === "approved"
    );

    const averageRating =
      approvedReviews.length > 0
        ? (
            approvedReviews.reduce(
              (sum, review) =>
                sum + review.rating,
              0
            ) / approvedReviews.length
          ).toFixed(1)
        : "0.0";

    return {
      total: reviews.length,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      averageRating,
    };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return reviews.filter((review) => {
      const matchesSearch =
        !query ||
        review.reviewerName
          .toLowerCase()
          .includes(query) ||
        review.productName
          .toLowerCase()
          .includes(query) ||
        review.comment
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        review.status === statusFilter;

      const matchesRating =
        ratingFilter === "all" ||
        review.rating ===
          Number(ratingFilter);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesRating
      );
    });
  }, [
    reviews,
    search,
    statusFilter,
    ratingFilter,
  ]);

  function clearFeedback() {
    setMessage("");
    setError("");
  }

  function handleStatusChange(
    review: AdminReview,
    status: ReviewStatus
  ) {
    clearFeedback();

    startTransition(async () => {
      const result =
        await updateReviewStatus(
          review.id,
          status
        );

      if (!result.success) {
        setError(
          result.error ||
            "Unable to update the review."
        );
        return;
      }

      setReviews((current) =>
        current.map((item) =>
          item.id === review.id
            ? {
                ...item,
                status,
              }
            : item
        )
      );

      setSelectedReview((current) =>
        current?.id === review.id
          ? {
              ...current,
              status,
            }
          : current
      );

      setMessage(
        `Review ${status}.`
      );
    });
  }

  function handleDelete(review: AdminReview) {
    clearFeedback();

    if (
      !window.confirm(
        "Delete this review permanently? This action cannot be undone."
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result =
        await deleteReview(review.id);

      if (!result.success) {
        setError(
          result.error ||
            "Unable to delete the review."
        );
        return;
      }

      setReviews((current) =>
        current.filter(
          (item) => item.id !== review.id
        )
      );

      setSelectedReview((current) =>
        current?.id === review.id
          ? null
          : current
      );

      setMessage(
        "Review deleted successfully."
      );
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#b28b16]">
            Customer Feedback
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#071a3a] sm:text-4xl">
            Reviews
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Review customer feedback, moderate submissions,
            and approve only the reviews that should appear
            publicly on the store.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            window.location.reload()
          }
          disabled={pending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#071a3a] shadow-sm transition hover:border-[#071a3a] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              pending
                ? "animate-spin"
                : ""
            }`}
          />
          Refresh
        </button>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm leading-6 text-red-700">
          <strong>
            Unable to load reviews:
          </strong>{" "}
          {loadError}
        </div>
      )}

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Total Reviews"
          value={String(stats.total)}
          icon={
            <MessageSquareText className="h-5 w-5" />
          }
        />

        <StatCard
          title="Pending"
          value={String(stats.pending)}
          icon={<Clock3 className="h-5 w-5" />}
          note="Needs moderation"
        />

        <StatCard
          title="Approved"
          value={String(stats.approved)}
          icon={
            <CheckCircle2 className="h-5 w-5" />
          }
        />

        <StatCard
          title="Rejected"
          value={String(stats.rejected)}
          icon={<XCircle className="h-5 w-5" />}
        />

        <StatCard
          title="Average Rating"
          value={stats.averageRating}
          icon={<Star className="h-5 w-5" />}
          note="Approved reviews"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Review List
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {filteredReviews.length} review
                {filteredReviews.length === 1
                  ? ""
                  : "s"} shown
              </p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <div className="relative md:min-w-[280px]">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  type="search"
                  value={search}
                  onChange={(event) => {
                    setSearch(
                      event.target.value
                    );
                    clearFeedback();
                  }}
                  placeholder="Search reviewer, product or review"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-[#071a3a] focus:ring-2 focus:ring-[#071a3a]/10"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(
                    event.target.value as StatusFilter
                  );
                  clearFeedback();
                }}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 outline-none focus:border-[#071a3a] focus:ring-2 focus:ring-[#071a3a]/10"
              >
                {statusOptions.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>

              <select
                value={ratingFilter}
                onChange={(event) => {
                  setRatingFilter(
                    event.target.value
                  );
                  clearFeedback();
                }}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 outline-none focus:border-[#071a3a] focus:ring-2 focus:ring-[#071a3a]/10"
              >
                {ratingOptions.map(
                  (option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        </div>

        {filteredReviews.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <MessageSquareText className="h-6 w-6" />
            </div>

            <h3 className="mt-5 text-lg font-bold text-slate-950">
              No reviews found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {reviews.length === 0
                ? "There are no customer reviews in the store yet."
                : "Try changing the search or filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70">
                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Reviewer
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Product
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Rating
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Review
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Status
                  </th>

                  <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                    Date
                  </th>

                  <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredReviews.map(
                  (review) => (
                    <tr
                      key={review.id}
                      className="transition hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-5 align-top">
                        <p className="max-w-[190px] font-bold text-slate-950">
                          {review.reviewerName}
                        </p>
                      </td>

                      <td className="px-6 py-5 align-top">
                        <p className="max-w-[190px] font-semibold text-slate-800">
                          {review.productName}
                        </p>
                      </td>

                      <td className="px-6 py-5 align-top">
                        <Stars
                          rating={review.rating}
                          small
                        />

                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {review.rating}/5
                        </p>
                      </td>

                      <td className="px-6 py-5 align-top">
                        <p className="max-w-[300px] text-sm leading-6 text-slate-600">
                          {review.comment ||
                            "No written comment."}
                        </p>
                      </td>

                      <td className="px-6 py-5 align-top">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold capitalize ${statusClasses(
                            review.status
                          )}`}
                        >
                          <StatusIcon
                            status={review.status}
                          />
                          {review.status}
                        </span>
                      </td>

                      <td className="px-6 py-5 align-top text-sm font-medium text-slate-500">
                        {formatDate(
                          review.createdAt
                        )}
                      </td>

                      <td className="px-6 py-5 align-top">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedReview(
                                review
                              )
                            }
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-[#071a3a] hover:text-[#071a3a]"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>

                          {review.status !==
                            "approved" && (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() =>
                                handleStatusChange(
                                  review,
                                  "approved"
                                )
                              }
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </button>
                          )}

                          {review.status !==
                            "rejected" && (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() =>
                                handleStatusChange(
                                  review,
                                  "rejected"
                                )
                              }
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          )}

                          {review.status !==
                            "pending" && (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() =>
                                handleStatusChange(
                                  review,
                                  "pending"
                                )
                              }
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-bold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Clock3 className="h-3.5 w-3.5" />
                              Pending
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              handleDelete(review)
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Delete review"
                            title="Delete review"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedReview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedReview(null);
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#b28b16]">
                    Review Details
                  </p>

                  <h3 className="mt-2 text-xl font-bold text-slate-950">
                    Customer Review
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelectedReview(null)
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                  aria-label="Close review details"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-6 px-6 py-6 sm:px-7">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Reviewer
                  </p>

                  <p className="mt-2 font-bold text-slate-950">
                    {selectedReview.reviewerName}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Product
                  </p>

                  <p className="mt-2 font-bold text-slate-950">
                    {selectedReview.productName}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Rating
                    </p>

                    <div className="mt-2 flex items-center gap-3">
                      <Stars
                        rating={
                          selectedReview.rating
                        }
                      />

                      <span className="font-bold text-slate-950">
                        {selectedReview.rating}/5
                      </span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold capitalize ${statusClasses(
                      selectedReview.status
                    )}`}
                  >
                    <StatusIcon
                      status={
                        selectedReview.status
                      }
                    />
                    {selectedReview.status}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Customer Comment
                </p>

                <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                    {selectedReview.comment ||
                      "No written comment was provided."}
                  </p>
                </div>
              </div>

              <div className="text-sm text-slate-500">
                Submitted{" "}
                <span className="font-semibold text-slate-700">
                  {formatDate(
                    selectedReview.createdAt
                  )}
                </span>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                {selectedReview.status !==
                  "approved" && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      handleStatusChange(
                        selectedReview,
                        "approved"
                      )
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Approve Review
                  </button>
                )}

                {selectedReview.status !==
                  "rejected" && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      handleStatusChange(
                        selectedReview,
                        "rejected"
                      )
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Review
                  </button>
                )}

                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    handleDelete(
                      selectedReview
                    )
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}