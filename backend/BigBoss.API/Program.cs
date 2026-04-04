using System.Text;
using BigBoss.Core.Interfaces;
using BigBoss.Infrastructure.Data;
using BigBoss.Infrastructure.Services;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Load .env file (only keys not already set)
var envPath = Path.Combine(Directory.GetCurrentDirectory(), "..", ".env");
if (File.Exists(envPath))
{
    foreach (var line in File.ReadAllLines(envPath))
    {
        if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#")) continue;
        var parts = line.Split('=', 2);
        if (parts.Length == 2)
        {
            var envKey = parts[0].Trim();
            var envVal = parts[1].Trim();
            if (string.IsNullOrEmpty(builder.Configuration[envKey]))
            {
                builder.Configuration[envKey] = envVal;
            }
        }
    }
}

// Configure Serilog
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/bigboss-.log", rollingInterval: RollingInterval.Day)
    .CreateLogger();

builder.Host.UseSerilog();

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Swagger
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Big Boss Fitness API",
        Version = "v1",
        Description = "API pour l'application Big Boss Fitness"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme",
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

// Database
var connectionString = builder.Configuration["BBF_DATABASE_URL"]
    ?? "Host=localhost;Database=bigbossfitness;Username=bigboss;Password=bigboss_dev_password";

var dataSourceBuilder = new Npgsql.NpgsqlDataSourceBuilder(connectionString);
dataSourceBuilder.EnableDynamicJson();
var dataSource = dataSourceBuilder.Build();

builder.Services.AddDbContext<BigBossDbContext>(options =>
    options.UseNpgsql(dataSource));

// JWT Authentication
var jwtSecret = builder.Configuration["BBF_JWT_SECRET"] ?? "default-dev-secret-key-min-32-chars!!";
var key = Encoding.UTF8.GetBytes(jwtSecret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false; // Set to true in production
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["BBF_JWT_ISSUER"] ?? "BigBossFitness",
        ValidateAudience = true,
        ValidAudience = builder.Configuration["BBF_JWT_AUDIENCE"] ?? "BigBossFitnessApp",
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

// FluentValidation
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<BigBoss.Core.DTOs.Auth.RegisterRequestValidator>();

// CORS
var allowedOrigins = builder.Configuration["BBF_ALLOWED_ORIGINS"]?.Split(',') ?? new[] { "http://localhost:3000", "http://localhost:3001", "http://localhost:8081" };
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowApp", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

// HttpClient for external APIs
builder.Services.AddHttpClient<IClaudeService, ClaudeService>();
builder.Services.AddHttpClient<IElevenLabsService, ElevenLabsService>();
builder.Services.AddHttpClient<OpenAIService>();

// Register services
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IExerciseService, ExerciseService>();
builder.Services.AddScoped<ISessionService, SessionService>();
builder.Services.AddScoped<INutritionService, NutritionService>();
builder.Services.AddScoped<ICoachService, CoachService>();
builder.Services.AddScoped<ICloudflareService, CloudflareService>();
builder.Services.AddScoped<IChallengeService, ChallengeService>();
builder.Services.AddScoped<IRecipeService, RecipeService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IBodyStatService, BodyStatService>();
builder.Services.AddScoped<IProgressPhotoService, ProgressPhotoService>();
builder.Services.AddScoped<ILiveService, LiveService>();
builder.Services.AddScoped<INutritionPlanService, NutritionPlanService>();
builder.Services.AddScoped<IProgrammeService, ProgrammeService>();

// Gamification services
builder.Services.AddMemoryCache();
builder.Services.AddScoped<IGamificationConfigService, GamificationConfigService>();
builder.Services.AddScoped<IPointsService, PointsService>();
builder.Services.AddScoped<IStreakService, StreakService>();
builder.Services.AddScoped<IChallengeParticipationService, ChallengeParticipationService>();
builder.Services.AddScoped<IShopService, ShopService>();
builder.Services.AddScoped<IAchievementService, AchievementService>();

// Build app
var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Big Boss Fitness API v1");
        c.RoutePrefix = "swagger";
    });
}

// CORS must be before other middlewares
app.UseCors("AllowApp");

// Global error handling middleware
app.UseMiddleware<BigBoss.API.Middlewares.ErrorHandlingMiddleware>();

// Rate limiting middleware
app.UseMiddleware<BigBoss.API.Middlewares.RateLimitingMiddleware>();

app.UseSerilogRequestLogging();

// Serve local videos as static files
var videosPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "videos");
if (Directory.Exists(videosPath))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(Path.GetFullPath(videosPath)),
        RequestPath = "/videos",
        ServeUnknownFileTypes = true,
        DefaultContentType = "video/mp4"
    });
    Log.Information("Serving local videos from {Path}", Path.GetFullPath(videosPath));
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

// Apply migrations in development
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<BigBossDbContext>();
    // Uncomment to auto-migrate: db.Database.Migrate();
}

// Listen on all interfaces for mobile development
app.Urls.Clear();
app.Urls.Add("http://0.0.0.0:5050");

Log.Information("Big Boss Fitness API starting on {Urls}", app.Urls);

app.Run();
