using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Setu.Api.Data;
using Setu.Api.Models;
using Setu.Api.Services;

namespace Setu.Api.Controllers
{
    [Authorize(Roles = "Admin")]
    [ApiController]
    [Route("api/[controller]")]
    public class AdminController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ISubscriptionService _subscriptionService;

        public AdminController(ApplicationDbContext context, ISubscriptionService subscriptionService)
        {
            _context = context;
            _subscriptionService = subscriptionService;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var totalUsers = await _context.Users.CountAsync(u => u.Role == UserRole.Customer);
            var activeSubs = await _context.Subscriptions.CountAsync(s => s.Status == "Active" && s.EndDate > DateTime.UtcNow);
            var expiredSubs = await _context.Subscriptions.CountAsync(s => s.Status == "Expired" || (s.Status == "Active" && s.EndDate <= DateTime.UtcNow));
            var pendingSubs = await _context.Subscriptions.CountAsync(s => s.Status == "Pending");

            return Ok(new
            {
                TotalUsers = totalUsers,
                ActiveSubscriptions = activeSubs,
                ExpiredSubscriptions = expiredSubs,
                PendingSubscriptionRequests = pendingSubs
            });
        }

        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers()
        {
            // OPTIMIZATION: Use single query with projections instead of multiple includes
            var users = await _context.Users
                .Where(u => u.Role == UserRole.Customer)
                .Select(u => new
                {
                    u.Id,
                    u.Name,
                    u.Email,
                    u.Role,
                    u.ContactNo,
                    u.IsActive,
                    AllowedTabsPattern = u.AllowedTabsPattern ?? "*",
                    u.CreatedAt,
                    Subscription = u.Subscription != null ? new
                    {
                        u.Subscription.Id,
                        u.Subscription.Status,
                        u.Subscription.StartDate,
                        u.Subscription.EndDate,
                        PlanName = u.Subscription.Plan!.Name,
                        IsActive = u.Subscription.Status == "Active" && u.Subscription.EndDate > DateTime.UtcNow
                    } : null
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpPost("subscriptions/create")]
        public async Task<IActionResult> CreateSubscription([FromBody] CreateSubscriptionDto dto)
        {
            var user = await _context.Users.FindAsync(dto.UserId);
            if (user == null) return NotFound(new { message = "User not found." });

            var plan = await _context.SubscriptionPlans.FindAsync(dto.PlanId);
            if (plan == null) return NotFound(new { message = "Plan not found." });

            // Remove existing subscription if any
            var existing = await _context.Subscriptions.FirstOrDefaultAsync(s => s.UserId == dto.UserId);
            if (existing != null) _context.Subscriptions.Remove(existing);

            var startDate = dto.StartDate ?? DateTime.UtcNow;
            DateTime endDate = plan.Validity == "Yearly"
                ? startDate.AddYears(1)
                : plan.Validity == "Quarterly"
                    ? startDate.AddMonths(3)
                    : startDate.AddMonths(1);

            var sub = new Subscription
            {
                Id = Guid.NewGuid(),
                UserId = dto.UserId,
                PlanId = dto.PlanId,
                StartDate = startDate,
                EndDate = endDate,
                Status = "Active"
            };

            _context.Subscriptions.Add(sub);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Subscription created successfully.",
                subscription = new { sub.Id, sub.Status, sub.StartDate, sub.EndDate, PlanName = plan.Name }
            });
        }

        [HttpPost("users/{userId}/role")]
        public async Task<IActionResult> AssignRole(Guid userId, [FromBody] RoleDto dto)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("User not found");

            user.Role = dto.Role;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Role updated successfully" });
        }

        [HttpPost("users/{userId}/toggle-status")]
        public async Task<IActionResult> ToggleUserStatus(Guid userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("User not found");

            user.IsActive = !user.IsActive;
            await _context.SaveChangesAsync();
            return Ok(new { message = $"User {(user.IsActive ? "activated" : "deactivated")} successfully", isActive = user.IsActive });
        }

        [HttpPost("users/{userId}/reset-password")]
        public async Task<IActionResult> ResetPassword(Guid userId, [FromBody] ResetPasswordDto dto)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("User not found");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Password reset successfully" });
        }

        [HttpGet("subscriptions/pending")]
        public async Task<IActionResult> GetPendingSubscriptions()
        {
            var pending = await _subscriptionService.GetPendingSubscriptions();
            return Ok(pending);
        }

        [HttpPost("subscriptions/{subscriptionId}/approve")]
        public async Task<IActionResult> ApproveSubscription(Guid subscriptionId)
        {
            var adminId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _subscriptionService.ApproveSubscription(subscriptionId, adminId);
            if (!result) return NotFound("Subscription not found");
            return Ok(new { message = "Subscription approved" });
        }

        [HttpPost("subscriptions/{subscriptionId}/reject")]
        public async Task<IActionResult> RejectSubscription(Guid subscriptionId)
        {
            var adminId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _subscriptionService.RejectSubscription(subscriptionId, adminId);
            if (!result) return NotFound("Subscription not found");
            return Ok(new { message = "Subscription rejected" });
        }

        [HttpGet("plans")]
        public async Task<IActionResult> GetPlans()
        {
            return Ok(await _context.SubscriptionPlans.ToListAsync());
        }

        [HttpPost("plans")]
        public async Task<IActionResult> CreatePlan([FromBody] SubscriptionPlan plan)
        {
            plan.Id = Guid.NewGuid();
            _context.SubscriptionPlans.Add(plan);
            await _context.SaveChangesAsync();
            return Ok(plan);
        }

        [HttpPut("plans/{id}")]
        public async Task<IActionResult> UpdatePlan(Guid id, [FromBody] SubscriptionPlan plan)
        {
            var existing = await _context.SubscriptionPlans.FindAsync(id);
            if (existing == null) return NotFound();

            existing.Name = plan.Name;
            existing.Description = plan.Description;
            existing.Price = plan.Price;
            existing.Validity = plan.Validity;
            existing.FeaturesJson = plan.FeaturesJson;
            existing.MaxCompanies = plan.MaxCompanies;
            existing.MaxProducts = plan.MaxProducts;
            existing.MaxUsers = plan.MaxUsers;
            existing.Status = plan.Status;

            await _context.SaveChangesAsync();
            return Ok(existing);
        }

        [HttpDelete("plans/{id}")]
        public async Task<IActionResult> DeletePlan(Guid id)
        {
            var plan = await _context.SubscriptionPlans.FindAsync(id);
            if (plan == null) return NotFound();

            _context.SubscriptionPlans.Remove(plan);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Plan deleted" });
        }

        [HttpPost("companies/register")]
        public async Task<IActionResult> RegisterCompanyForUser([FromBody] RegisterCompanyDto dto)
        {
            // Verify the user exists
            var user = await _context.Users.FindAsync(dto.UserId);
            if (user == null) return NotFound(new { message = "User not found." });

            // Create the company
            var company = new Company
            {
                Id = Guid.NewGuid(),
                UserId = dto.UserId,
                Name = dto.Name,
                Address = dto.Address,
                Country = dto.Country,
                Currency = dto.Currency,
                CurrencySymbol = dto.CurrencySymbol,
                Contact = dto.Contact,
                Type = dto.Type,
                TaxId = dto.TaxId,
                GstNumber = dto.GstNumber,
                LicenseNumber = dto.LicenseNumber,
                BankAccount = dto.BankAccount,
                BankName = dto.BankName,
                IfscCode = dto.IfscCode,
                BranchName = dto.BranchName,
                Industry = dto.Industry,
                Employees = dto.Employees,
                Revenue = dto.Revenue,
                Expenses = dto.Expenses,
                IncorporationDate = DateTime.SpecifyKind(dto.IncorporationDate, DateTimeKind.Utc),
                Website = dto.Website
            };

            _context.Companies.Add(company);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Business registered successfully for {user.Name}",
                company = new
                {
                    company.Id,
                    company.Name,
                    company.Country,
                    Owner = user.Name
                }
            });
        }
    }

    public record RoleDto(UserRole Role);
    public record ResetPasswordDto(string NewPassword);
    public record CreateSubscriptionDto(Guid UserId, Guid PlanId, DateTime? StartDate);
    public record RegisterCompanyDto(
        Guid UserId,
        string Name,
        string Address,
        string Country,
        string Currency,
        string CurrencySymbol,
        string Contact,
        BusinessType Type,
        string TaxId,
        string? GstNumber,
        string LicenseNumber,
        string BankAccount,
        string? BankName,
        string? IfscCode,
        string? BranchName,
        string Industry,
        int Employees,
        decimal Revenue,
        decimal Expenses,
        DateTime IncorporationDate,
        string? Website
    );
}
