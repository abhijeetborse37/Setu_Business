using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Setu.Api.Data;

using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://*:{port}");

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options => {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Setu API", Version = "v1" });
    
    // JWT Authentication for Swagger
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// DbContext
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Services
builder.Services.AddScoped<Setu.Api.Services.ISubscriptionService, Setu.Api.Services.SubscriptionService>();

// Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder => builder.AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader());
});

var app = builder.Build();

// ===== AUTO-SEED SUPER ADMIN ON FIRST RUN =====
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try
    {
        db.Database.Migrate(); // Ensure migrations are applied

        var hasAdmin = db.Users.Any(u => u.Role == Setu.Api.Models.UserRole.Admin);
        if (!hasAdmin)
        {
            var adminPassword = "Admin@123";
            var adminUser = new Setu.Api.Models.User
            {
                Id = Guid.NewGuid(),
                Name = "Super Admin",
                Email = "admin@setu.in",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
                Role = Setu.Api.Models.UserRole.Admin,
                ContactNo = "9999999999",
                AllowedTabsPattern = "*",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.Users.Add(adminUser);
            db.SaveChanges();

            logger.LogInformation("==============================================");
            logger.LogInformation("  SUPER ADMIN SEEDED SUCCESSFULLY!");
            logger.LogInformation("  Email   : admin@setu.in");
            logger.LogInformation("  Password: Admin@123");
            logger.LogInformation("  CHANGE THIS PASSWORD AFTER FIRST LOGIN!");
            logger.LogInformation("==============================================");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error during database seeding.");
    }
}
// ===== END SEEDING =====

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Setu API v1");
        c.RoutePrefix = "swagger"; // Available at http://localhost:PORT/swagger
    });
}

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Setu API v1");
    c.RoutePrefix = "swagger";
});

// app.UseHttpsRedirection();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapGet("/", () => "SETU ERP API Running...");

app.Run();
