using BigBoss.Infrastructure.Services;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace BigBoss.Tests.Services;

/// <summary>
/// Sprint 5.3 — Tests pour CloudflareStreamService mode mock (sans creds CF).
/// </summary>
public class CloudflareStreamServiceTests
{
    private CloudflareStreamService BuildService(bool configured = false)
    {
        var configValues = new Dictionary<string, string?>();
        if (configured)
        {
            configValues["BBF_CLOUDFLARE_ACCOUNT_ID"] = "real-account-id";
            configValues["BBF_CF_STREAM_API_TOKEN"] = "real-token";
        }
        var config = new ConfigurationBuilder().AddInMemoryCollection(configValues).Build();
        var logger = new Mock<ILogger<CloudflareStreamService>>();
        return new CloudflareStreamService(new HttpClient(), config, logger.Object);
    }

    [Fact]
    public async Task CreateLiveInputAsync_NotConfigured_ReturnsMock()
    {
        var service = BuildService(configured: false);
        service.IsConfigured.Should().BeFalse();

        var result = await service.CreateLiveInputAsync("BBF-Live-test");

        result.IsMock.Should().BeTrue();
        result.LiveInputUid.Should().StartWith("mock-");
        result.HlsUrl.Should().Contain("mux.dev"); // Mux test stream HLS public
        result.RtmpKey.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task GetLiveInputStatusAsync_NotConfigured_ReturnsMockIdle()
    {
        var service = BuildService(configured: false);
        var status = await service.GetLiveInputStatusAsync("any-uid");

        status.State.Should().Be("mock-idle");
        status.LiveInputUid.Should().Be("any-uid");
    }

    [Fact]
    public void IsConfigured_RequiresBothAccountAndToken()
    {
        var noAccount = BuildService(configured: false);
        noAccount.IsConfigured.Should().BeFalse();

        // Placeholder n'est pas configuré
        var placeholder = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["BBF_CLOUDFLARE_ACCOUNT_ID"] = "placeholder",
            ["BBF_CF_STREAM_API_TOKEN"] = "token",
        }).Build();
        var s = new CloudflareStreamService(new HttpClient(), placeholder, Mock.Of<ILogger<CloudflareStreamService>>());
        s.IsConfigured.Should().BeFalse();
    }
}
