using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Setu.Api.Data;
using Setu.Api.Models;
using System.Security.Claims;

namespace Setu.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    [Setu.Api.Filters.SubscriptionRequired]
    public class TransactionsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public TransactionsController(ApplicationDbContext context)
        {
            _context = context;
        }

        private Guid UserId => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

        [HttpGet("{companyId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetTransactions(Guid companyId)
        {
            // OPTIMIZATION: Use projections instead of loading all entities into memory
            var transactions = await _context.Transactions
                .Where(t => t.CompanyId == companyId)
                .OrderByDescending(t => t.Date)
                .Select(t => new
                {
                    t.Id,
                    t.Type,
                    t.TotalAmount,
                    t.TotalTax,
                    t.CgstTotal,
                    t.SgstTotal,
                    t.RoundOff,
                    t.Date,
                    t.EntityName,
                    t.EntityGstNumber,
                    t.InvoiceNumber,
                    t.CompanyId,
                    Items = t.Items.Select(i => new
                    {
                        i.Id,
                        i.ProductId,
                        i.ProductName,
                        i.HsnCode,
                        i.Quantity,
                        i.UnitPrice,
                        i.TaxRate,
                        i.TaxAmount,
                        i.TotalAmount,
                        i.CgstRate,
                        i.SgstRate,
                        i.CgstAmount,
                        i.SgstAmount
                    }).ToList()
                })
                .ToListAsync();

            return Ok(transactions);
        }

        [HttpPost]
        public async Task<ActionResult<Transaction>> CreateTransaction(Transaction transaction)
        {
            transaction.Id = Guid.NewGuid();
            transaction.UserId = UserId;
            transaction.Date = DateTime.SpecifyKind(transaction.Date, DateTimeKind.Utc);
            transaction.InvoiceNumber = "TXN-" + Guid.NewGuid().ToString().Substring(0, 8).ToUpper();

            // OPTIMIZATION: Batch fetch all products needed instead of fetching one by one
            var productIds = transaction.Items.Select(i => i.ProductId).Distinct().ToList();
            var products = await _context.Products
                .Where(p => productIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id);

            foreach (var item in transaction.Items)
            {
                item.Id = Guid.NewGuid();
                item.TransactionId = transaction.Id;
                
                // Fetch product name and HSN Code if missing - using pre-loaded products
                if (products.TryGetValue(item.ProductId, out var product))
                {
                    if (string.IsNullOrEmpty(item.ProductName))
                        item.ProductName = product.Name;
                    if (string.IsNullOrEmpty(item.HsnCode))
                        item.HsnCode = product.HsnCode;
                }
            }

            try
            {
                _context.Transactions.Add(transaction);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Database error: {ex.Message}. Inner: {ex.InnerException?.Message}");
            }

            return Ok(transaction);
        }
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTransaction(Guid id, Transaction transaction)
        {
            Console.WriteLine($"Updating Transaction: {id} (Body ID: {transaction.Id})");
            
            if (id != transaction.Id) return BadRequest("ID Mismatch");
            if (transaction.UserId != UserId) return Forbid();

            try
            {
                var existing = await _context.Transactions
                    .Include(t => t.Items)
                    .FirstOrDefaultAsync(t => t.Id == id);

                if (existing == null) {
                    Console.WriteLine($"Transaction {id} not found in database.");
                    return NotFound();
                }

                // Update basic properties
                existing.Type = transaction.Type;
                existing.Date = DateTime.SpecifyKind(transaction.Date, DateTimeKind.Utc);
                existing.EntityName = transaction.EntityName;
                existing.TotalAmount = transaction.TotalAmount;
                existing.TotalTax = transaction.TotalTax;
                
                if (!string.IsNullOrEmpty(transaction.InvoiceNumber)) {
                    existing.InvoiceNumber = transaction.InvoiceNumber;
                }

                // OPTIMIZATION: Batch fetch all products instead of one-by-one
                var productIds = transaction.Items.Select(i => i.ProductId).Distinct().ToList();
                var products = await _context.Products
                    .Where(p => productIds.Contains(p.Id))
                    .ToDictionaryAsync(p => p.Id);

                // Update Items: Clear and Re-add (Cleanest way for simple transactions)
                _context.TransactionItems.RemoveRange(existing.Items);
                
                foreach (var item in transaction.Items)
                {
                    item.Id = Guid.NewGuid();
                    item.TransactionId = id;
                    
                    // Use pre-loaded products instead of individual lookups
                    if (products.TryGetValue(item.ProductId, out var product))
                    {
                        if (string.IsNullOrEmpty(item.ProductName))
                            item.ProductName = product.Name;
                        if (string.IsNullOrEmpty(item.HsnCode))
                            item.HsnCode = product.HsnCode;
                    }
                    
                    _context.TransactionItems.Add(item);
                }

                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (DbUpdateConcurrencyException ex)
            {
                Console.WriteLine("Concurrency error: " + ex.Message);
                return Conflict("The record was modified or deleted by another user.");
            }
            catch (Exception ex)
            {
                Console.WriteLine("Update error: " + ex.Message);
                return StatusCode(500, $"Database error: {ex.Message}. Inner: {ex.InnerException?.Message}");
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTransaction(Guid id)
        {
            var transaction = await _context.Transactions.FindAsync(id);
            if (transaction == null) return NotFound();
            if (transaction.UserId != UserId) return Forbid();

            _context.Transactions.Remove(transaction);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
