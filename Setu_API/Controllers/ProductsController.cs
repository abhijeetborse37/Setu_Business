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
    public class ProductsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ISubscriptionService _subscriptionService;

        public ProductsController(ApplicationDbContext context, ISubscriptionService subscriptionService)
        {
            _context = context;
            _subscriptionService = subscriptionService;
        }

        private Guid UserId => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

        [HttpGet("{companyId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetProducts(Guid companyId)
        {
            try
            {
                var products = await _context.Products
                    .Where(p => p.CompanyId == companyId)
                    .OrderBy(p => p.Name)
                    .ToListAsync();

                var productIds = products.Select(p => p.Id).ToList();
                
                var stockItems = await _context.TransactionItems
                    .Include(ti => ti.Transaction)
                    .Where(ti => productIds.Contains(ti.ProductId))
                    .GroupBy(ti => new { ti.ProductId, Type = ti.Transaction != null ? ti.Transaction.Type : "NONE" })
                    .Select(g => new { g.Key.ProductId, g.Key.Type, Total = g.Sum(x => x.Quantity) })
                    .ToListAsync();

                var result = products.Select(p => 
                {
                    var tin = stockItems.FirstOrDefault(s => s.ProductId == p.Id && s.Type == "PURCHASE")?.Total ?? 0;
                    var tout = stockItems.FirstOrDefault(s => s.ProductId == p.Id && s.Type == "SALE")?.Total ?? 0;
                    return new 
                    {
                        p.Id,
                        p.Name,
                        p.Description,
                        p.Category,
                        p.Price,
                        p.PurchasePrice,
                        Stock = Math.Max(0, p.Stock + tin - tout),
                        p.Supplier,
                        p.Sku,
                        p.Image,
                        p.CompanyId,
                        p.UserId
                    };
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error fetching products: {ex.Message}");
            }
        }

        [HttpPost]
        public async Task<ActionResult<Product>> CreateProduct(Product product)
        {
            /*
            if (!await _subscriptionService.HasActiveSubscription(UserId))
            {
                return BadRequest("Active subscription required.");
            }

            if (!await _subscriptionService.CanCreateProduct(UserId, product.CompanyId))
            {
                return BadRequest("Product limit reached for your plan.");
            }
            */

            product.Id = Guid.NewGuid();
            product.UserId = UserId;
            
            _context.Products.Add(product);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Database error: {ex.Message}. Inner: {ex.InnerException?.Message}");
            }

            return Ok(product);
        }
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProduct(Guid id, Product product)
        {
            if (id != product.Id) return BadRequest("ID mismatch");
            if (product.UserId != UserId) return Forbid();

            _context.Entry(product).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ProductExists(id)) return NotFound();
                else throw;
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProduct(Guid id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) return NotFound();
            if (product.UserId != UserId) return Forbid();

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool ProductExists(Guid id)
        {
            return _context.Products.Any(e => e.Id == id);
        }
    }
}
