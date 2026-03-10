using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Setu.Api.Data;
using Setu.Api.Models;

namespace Setu.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto login)
        {
            try
            {
                var user = await _context.Users
                    .Include(u => u.Subscription)
                    .ThenInclude(s => s!.Plan)
                    .FirstOrDefaultAsync(u => u.Email == login.Email);

                if (user == null || !BCrypt.Net.BCrypt.Verify(login.Password, user.PasswordHash))
                {
                    return Unauthorized(new { message = "Invalid email or password" });
                }

                if (!user.IsActive)
                {
                    return BadRequest(new { message = "Your account has been deactivated. Please contact support." });
                }

                var token = GenerateJwtToken(user);

                var subscriptionStatus = user.Subscription?.Status ?? "None";
                var subscriptionEndDate = user.Subscription?.EndDate;
                var isSubscriptionActive = user.Subscription?.IsActive ?? false;

                // Warning if subscription expires soon (5 days)
                string? warningMessage = null;
                if (isSubscriptionActive && subscriptionEndDate.HasValue)
                {
                    var daysLeft = (subscriptionEndDate.Value - DateTime.UtcNow).TotalDays;
                    if (daysLeft > 0 && daysLeft <= 5)
                    {
                        warningMessage = $"Your subscription will expire in {Math.Ceiling(daysLeft)} days.";
                    }
                }

                return Ok(new
                {
                    Token = token,
                    User = new
                    {
                        user.Id,
                        user.Name,
                        user.Email,
                        user.Role,
                        SubscriptionStatus = subscriptionStatus,
                        SubscriptionEndDate = subscriptionEndDate,
                        IsSubscriptionActive = isSubscriptionActive,
                        PlanName = user.Subscription?.Plan?.Name ?? "None",
                        WarningMessage = warningMessage
                    }
                });
            }
            catch (Exception ex)
            {
                // Return details about the error to help identify if it's a missing column/table
                return StatusCode(500, new { 
                    message = "Database Error: Please ensure you have executed the latest schema.sql. " + ex.Message,
                    details = ex.InnerException?.Message 
                });
            }
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto register)
        {
            if (await _context.Users.AnyAsync(u => u.Email == register.Email))
            {
                return BadRequest(new { message = "Email already exists" });
            }

            var user = new User
            {
                Id = Guid.NewGuid(),
                Name = register.Name,
                Email = register.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(register.Password),
                Role = UserRole.Customer, // Default to Customer
                IsActive = true
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            var token = GenerateJwtToken(user);

            return Ok(new { 
                message = "Registration successful!",
                Token = token,
                User = new {
                    user.Id,
                    user.Name,
                    user.Email,
                    user.Role,
                    SubscriptionStatus = "None",
                    IsSubscriptionActive = false
                }
            });
        }

        private string GenerateJwtToken(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role.ToString()),
                new Claim("SubscriptionStatus", user.Subscription?.Status ?? "None")
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expires = DateTime.UtcNow.AddDays(Convert.ToDouble(_configuration["Jwt:ExpireDays"] ?? "7"));

            var token = new JwtSecurityToken(
                _configuration["Jwt:Issuer"],
                _configuration["Jwt:Audience"],
                claims,
                expires: expires,
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    public record LoginDto(string Email, string Password);
    public record RegisterDto(string Name, string Email, string Password);
}
