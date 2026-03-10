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
    public class CustomersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CustomersController(ApplicationDbContext context)
        {
            _context = context;
        }

        private Guid UserId => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Customer>>> GetCustomers()
        {
            return await _context.Customers
                .Where(c => c.UserId == UserId)
                .ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<Customer>> CreateCustomer(Customer customer)
        {
            try 
            {
                customer.Id = Guid.NewGuid();
                customer.UserId = UserId;
                
                // If companyId is empty guid, it might be because frontend didn't send it or sent null/empty string
                if (customer.CompanyId == Guid.Empty)
                {
                    return BadRequest("A valid Company Selection is required to register a customer.");
                }

                _context.Customers.Add(customer);
                await _context.SaveChangesAsync();

                return Ok(customer);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Database error: {ex.Message}. Inner: {ex.InnerException?.Message}");
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCustomer(Guid id, Customer customer)
        {
            try 
            {
                if (id != customer.Id) return BadRequest("Customer ID mismatch.");
                
                // Ensure UserId is set correctly for the check
                customer.UserId = UserId;

                _context.Entry(customer).State = EntityState.Modified;
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Database error: {ex.Message}. Inner: {ex.InnerException?.Message}");
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCustomer(Guid id)
        {
            try 
            {
                var customer = await _context.Customers.FindAsync(id);
                if (customer == null) return NotFound();
                if (customer.UserId != UserId) return Forbid();

                _context.Customers.Remove(customer);
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Database error: {ex.Message}. Inner: {ex.InnerException?.Message}");
            }
        }
    }
}
