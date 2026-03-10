using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Setu.Api.Data;
using Setu.Api.Models;
using Setu.Api.Services;
using System.Security.Claims;

namespace Setu.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    [Setu.Api.Filters.SubscriptionRequired]
    public class CompaniesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ISubscriptionService _subscriptionService;

        public CompaniesController(ApplicationDbContext context, ISubscriptionService subscriptionService)
        {
            _context = context;
            _subscriptionService = subscriptionService;
        }

        private Guid UserId => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Company>>> GetCompanies()
        {
            return await _context.Companies
                .Where(c => c.UserId == UserId)
                .ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<Company>> CreateCompany(Company company)
        {
            /*
            if (!await _subscriptionService.HasActiveSubscription(UserId))
            {
                return BadRequest("Active subscription required to create companies.");
            }

            if (!await _subscriptionService.CanCreateCompany(UserId))
            {
                return BadRequest("Company limit reached for your current plan.");
            }
            */

            company.Id = Guid.NewGuid();
            company.UserId = UserId;
            company.IncorporationDate = DateTime.SpecifyKind(company.IncorporationDate, DateTimeKind.Utc);
            _context.Companies.Add(company);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Database error: {ex.Message}. Inner: {ex.InnerException?.Message}");
            }

            return CreatedAtAction(nameof(GetCompanies), null, company);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCompany(Guid id, Company company)
        {
            if (id != company.Id) return BadRequest();
            if (company.UserId != UserId) return Forbid();
            company.IncorporationDate = DateTime.SpecifyKind(company.IncorporationDate, DateTimeKind.Utc);
            _context.Entry(company).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!CompanyExists(id)) return NotFound();
                else throw;
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCompany(Guid id)
        {
            var company = await _context.Companies.FindAsync(id);
            if (company == null) return NotFound();
            if (company.UserId != UserId) return Forbid();

            _context.Companies.Remove(company);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool CompanyExists(Guid id)
        {
            return _context.Companies.Any(e => e.Id == id);
        }
    }
}
