using BackendApi.Helper;
using BackendApi.Repository;
using BackendApi.Service;
using Microsoft.AspNetCore.Http;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddScoped<ICryptoService, CryptoService>();

// ✅ Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        // NOTE: Api Tester can send requests to arbitrary URLs typed by the user.
        // To prevent CORS errors, allow common frontend origins during development.
        // Production remains restricted to known deployed origins.
        if (builder.Environment.IsDevelopment())
        {
            policy
                .SetIsOriginAllowed(_ => true) // allow any origin (dev)
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
        else
        {
            policy
                .WithOrigins("http://localhost:4200", "https://proud-sand-02cef3700.7.azurestaticapps.net")
                .AllowAnyHeader()
                .AllowAnyMethod();
        }
    });
});


var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors("AllowAngular");

// Allow preflight requests to succeed before auth/middleware.
app.Use(async (ctx, next) =>
{
    if (string.Equals(ctx.Request.Method, "OPTIONS", StringComparison.OrdinalIgnoreCase))
    {
        ctx.Response.StatusCode = StatusCodes.Status204NoContent;
        return;
    }
    await next();
});

app.UseAuthorization();

app.UseMiddleware<CustomMiddleware>();

app.MapControllers();

app.Run();
