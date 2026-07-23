using GameRetro.Api.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace GameRetro.Api.Data;

/// <summary>
/// The single EF Core database context for the whole app (research.md Decision 5 — one context, not
/// two). It already carried the Identity tables (Users, Roles, etc.) via <see cref="IdentityDbContext{TUser}"/>;
/// this feature adds the four community tables and wires up how they relate to each other and to the
/// existing <see cref="ApplicationUser"/>.
///
/// Mentor note — how to read <see cref="OnModelCreating"/> below:
///   Each <c>modelBuilder.Entity&lt;X&gt;()</c> block describes ONE table. Inside it, <c>HasOne/WithMany</c>
///   declares a foreign-key relationship, <c>HasForeignKey</c> names the column that holds it, and
///   <c>OnDelete(...)</c> decides what happens to the child row when the parent is deleted. Getting
///   those delete rules right is what makes "delete a review and its comments vanish" work — and what
///   keeps a report alive after the thing it reported is gone.
/// </summary>
public sealed class AuthDbContext : IdentityDbContext<ApplicationUser>
{
    public AuthDbContext(DbContextOptions<AuthDbContext> options) : base(options)
    {
    }

    // Each DbSet is the entry point for querying/saving one table.
    public DbSet<Game> Games => Set<Game>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<Report> Reports => Set<Report>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Always call the base first so Identity's own tables are configured before we add ours.
        base.OnModelCreating(modelBuilder);

        // ---------------------------------------------------------------------------------------
        // GAME
        // ---------------------------------------------------------------------------------------
        modelBuilder.Entity<Game>(game =>
        {
            game.HasKey(g => g.Id);

            // The primary key is the IGDB id we assign by hand — tell EF NOT to generate it for us,
            // otherwise it would try to auto-increment and ignore the external id we set.
            game.Property(g => g.Id).ValueGeneratedNever();
        });

        // ---------------------------------------------------------------------------------------
        // REVIEW
        // ---------------------------------------------------------------------------------------
        modelBuilder.Entity<Review>(review =>
        {
            review.HasKey(r => r.Id);
            review.Property(r => r.Text).IsRequired();

            // Review → Game (many reviews to one game). Restrict: a Game is never hard-deleted in this
            // app (Admins only hide it), so we never expect this cascade to fire; Restrict documents
            // that intent and keeps the delete graph a simple tree.
            review.HasOne(r => r.Game)
                  .WithMany(g => g.Reviews)
                  .HasForeignKey(r => r.GameId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Review → Author (many reviews to one account). Restrict at the DB level: when an Admin
            // deletes an account we remove that account's reviews explicitly in UserAdminService
            // (so the deletion is visible and traceable in code, not hidden in a DB trigger).
            review.HasOne(r => r.Author)
                  .WithMany(u => u.Reviews)
                  .HasForeignKey(r => r.AuthorId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Business rule FR-005a: exactly ONE review per (game, author). A unique index makes the
            // database itself reject a duplicate, backing up the service-layer "update instead of
            // insert" logic.
            review.HasIndex(r => new { r.GameId, r.AuthorId }).IsUnique();
        });

        // ---------------------------------------------------------------------------------------
        // COMMENT
        // ---------------------------------------------------------------------------------------
        modelBuilder.Entity<Comment>(comment =>
        {
            comment.HasKey(c => c.Id);
            comment.Property(c => c.Text).IsRequired();

            // Comment → Review (many comments to one review). ClientCascade means: when we delete a
            // review that we have loaded WITH its comments (Include(r => r.Comments)), EF Core deletes
            // those comments too — but the DATABASE-level rule is "no action". We choose ClientCascade
            // (not a DB cascade) on purpose: a DB cascade here would create a second delete path to the
            // Reports table (review → comment → report) alongside the direct one (review → report),
            // which SQL Server forbids as "multiple cascade paths". Doing the comment cleanup in EF's
            // in-memory graph sidesteps that while keeping the behaviour identical.
            comment.HasOne(c => c.Review)
                   .WithMany(r => r.Comments)
                   .HasForeignKey(c => c.ReviewId)
                   .OnDelete(DeleteBehavior.ClientCascade);

            // Comment → Author. Restrict, same reasoning as Review → Author above.
            comment.HasOne(c => c.Author)
                   .WithMany(u => u.Comments)
                   .HasForeignKey(c => c.AuthorId)
                   .OnDelete(DeleteBehavior.Restrict);
        });

        // ---------------------------------------------------------------------------------------
        // REPORT — the trickiest delete rules live here.
        // ---------------------------------------------------------------------------------------
        modelBuilder.Entity<Report>(report =>
        {
            report.HasKey(p => p.Id);

            // Store the two enums as readable strings ("Spam", "Open") rather than raw ints, so the
            // database is self-describing when you inspect it directly.
            report.Property(p => p.Reason).HasConversion<string>();
            report.Property(p => p.Status).HasConversion<string>();

            // Report → Reporter (the account that raised it). Cascade: if that account is deleted, the
            // reports it raised go with it — they no longer need an Admin's attention. This is the ONLY
            // database-level cascade in the whole schema, and it is a single, non-branching path
            // (account → report), so it is safe.
            report.HasOne(p => p.Reporter)
                  .WithMany(u => u.Reports)
                  .HasForeignKey(p => p.ReporterId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Report → Review (the reported review), via a NULLABLE FK. SetNull is the crucial choice:
            // when the reported review is deleted, the database sets THIS column to null but LEAVES the
            // report row standing. That is what lets an Admin's "resolve by removing content" work —
            // we mark the report Resolved, then delete the review; the report survives with a null
            // target and its Resolved status intact (research.md Decision 3).
            report.HasOne(p => p.Review)
                  .WithMany(r => r.Reports)
                  .HasForeignKey(p => p.ReviewId)
                  .OnDelete(DeleteBehavior.SetNull);

            // Report → Comment, same SetNull reasoning as Report → Review.
            report.HasOne(p => p.Comment)
                  .WithMany(c => c.Reports)
                  .HasForeignKey(p => p.CommentId)
                  .OnDelete(DeleteBehavior.SetNull);

            // FR-017: a user may report a given target at most once. Two FILTERED unique indexes — one
            // per target column — enforce "one report per (reporter, review)" and "one per
            // (reporter, comment)" while ignoring the rows where that column is null (a comment-report
            // has a null ReviewId, and vice versa, so an unfiltered index would clash on those nulls).
            report.HasIndex(p => new { p.ReporterId, p.ReviewId })
                  .IsUnique()
                  .HasFilter("[ReviewId] IS NOT NULL");

            report.HasIndex(p => new { p.ReporterId, p.CommentId })
                  .IsUnique()
                  .HasFilter("[CommentId] IS NOT NULL");
        });
    }
}
