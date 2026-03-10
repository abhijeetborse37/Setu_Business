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
        public async Task<ActionResult<IEnumerable<Transaction>>> GetTransactions(Guid companyId)
        {
            return await _context.Transactions
                .Include(t => t.Items)
                .Where(t => t.CompanyId == companyId)
                .OrderByDescending(t => t.Date)
                .ToListAsync();
        }

        [HttpPost]
        public async Task<ActionResult<Transaction>> CreateTransaction(Transaction transaction)
        {
            transaction.Id = Guid.NewGuid();
            transaction.UserId = UserId;
            transaction.Date = DateTime.SpecifyKind(transaction.Date, DateTimeKind.Utc);
            transaction.InvoiceNumber = "TXN-" + Guid.NewGuid().ToString().Substring(0, 8).ToUpper();

            foreach (var item in transaction.Items)
            {
                item.Id = Guid.NewGuid();
                item.TransactionId = transaction.Id;
                
                // Fetch product name if missing
                if (string.IsNullOrEmpty(item.ProductName))
                {
                    var product = await _context.Products.FindAsync(item.ProductId);
                    if (product != null) item.ProductName = product.Name;
                }
            }

            if (transaction.Type == "SALE")
            {
                foreach (var item in transaction.Items)
                {
                    // Calculate current stock for the product
                    var tin = await _context.TransactionItems
                        .Include(ti => ti.Transaction)
                        .Where(ti => ti.ProductId == item.ProductId && ti.Transaction!.Type == "PURCHASE" && ti.Transaction.CompanyId == transaction.CompanyId)
                        .SumAsync(ti => ti.Quantity);

                    var tout = await _context.TransactionItems
                        .Include(ti => ti.Transaction)
                        .Where(ti => ti.ProductId == item.ProductId && ti.Transaction!.Type == "SALE" && ti.Transaction.CompanyId == transaction.CompanyId)
                        .SumAsync(ti => ti.Quantity);

                    var product = await _context.Products.FindAsync(item.ProductId);
                    var initialStock = product?.Stock ?? 0;
                    var currentStock = initialStock + tin - tout;

                    if (item.Quantity > currentStock)
                    {
                        return BadRequest($"Insufficient stock for product '{item.ProductName ?? product?.Name}'. Current stock: {currentStock}, Requested: {item.Quantity}");
                    }
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

                // Update Items: Clear and Re-add (Cleanest way for simple transactions)
                _context.TransactionItems.RemoveRange(existing.Items);
                
                foreach (var item in transaction.Items)
                {
                    item.Id = Guid.NewGuid();
                    item.TransactionId = id;
                    
                    if (string.IsNullOrEmpty(item.ProductName))
                    {
                        var product = await _context.Products.FindAsync(item.ProductId);
                        if (product != null) item.ProductName = product.Name;
                    }
                    
                    _context.TransactionItems.Add(item);
                }

                if (transaction.Type == "SALE")
                {
                    foreach (var item in transaction.Items)
                    {
                        // Calculate current stock EXCLUDING the current transaction (since we're updating it)
                        var tin = await _context.TransactionItems
                            .Include(ti => ti.Transaction)
                            .Where(ti => ti.ProductId == item.ProductId && ti.Transaction!.Type == "PURCHASE" && ti.Transaction.CompanyId == existing.CompanyId)
                            .SumAsync(ti => ti.Quantity);

                        var tout = await _context.TransactionItems
                            .Include(ti => ti.Transaction)
                            .Where(ti => ti.ProductId == item.ProductId && ti.Transaction!.Type == "SALE" && ti.Transaction.CompanyId == existing.CompanyId && ti.TransactionId != id)
                            .SumAsync(ti => ti.Quantity);

                        var product = await _context.Products.FindAsync(item.ProductId);
                        var initialStock = product?.Stock ?? 0;
                        var currentStock = initialStock + tin - tout;

                        if (item.Quantity > currentStock)
                        {
                            return BadRequest($"Insufficient stock-out for product '{item.ProductName ?? product?.Name}'. Available limit: {currentStock}, Requested: {item.Quantity}");
                        }
                    }
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
