using Amazon.S3;
using Amazon.S3.Model;
using BigBoss.Core.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace BigBoss.Infrastructure.Services;

public class CloudflareService : ICloudflareService
{
    private readonly IAmazonS3 _s3Client;
    private readonly ILogger<CloudflareService> _logger;
    private readonly string _bucketName;
    private readonly string _publicUrl;
    private readonly int _defaultExpirySeconds;

    public CloudflareService(
        IConfiguration configuration,
        ILogger<CloudflareService> logger)
    {
        _logger = logger;
        _bucketName = configuration["BBF_CLOUDFLARE_R2_BUCKET"] ?? "bigboss-videos";
        _publicUrl = configuration["BBF_CLOUDFLARE_R2_PUBLIC_URL"] ?? "";
        _defaultExpirySeconds = int.Parse(configuration["BBF_CLOUDFLARE_SIGNED_URL_EXPIRY"] ?? "1800");

        var accountId = configuration["BBF_CLOUDFLARE_ACCOUNT_ID"];
        var accessKey = configuration["BBF_CLOUDFLARE_R2_ACCESS_KEY"];
        var secretKey = configuration["BBF_CLOUDFLARE_R2_SECRET_KEY"];

        var config = new AmazonS3Config
        {
            ServiceURL = $"https://{accountId}.r2.cloudflarestorage.com",
            ForcePathStyle = true
        };

        _s3Client = new AmazonS3Client(accessKey, secretKey, config);
    }

    public async Task<string> GetSignedUrlAsync(string objectKey, int expirySeconds = 0)
    {
        if (expirySeconds <= 0) expirySeconds = _defaultExpirySeconds;

        try
        {
            var request = new GetPreSignedUrlRequest
            {
                BucketName = _bucketName,
                Key = objectKey,
                Expires = DateTime.UtcNow.AddSeconds(expirySeconds),
                Verb = HttpVerb.GET
            };

            var url = await _s3Client.GetPreSignedURLAsync(request);
            return url;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating signed URL for {ObjectKey}", objectKey);
            throw;
        }
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string objectKey, string contentType)
    {
        try
        {
            var request = new PutObjectRequest
            {
                BucketName = _bucketName,
                Key = objectKey,
                InputStream = fileStream,
                ContentType = contentType
            };

            await _s3Client.PutObjectAsync(request);

            _logger.LogInformation("File uploaded to R2: {ObjectKey}", objectKey);

            return objectKey;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading file to R2: {ObjectKey}", objectKey);
            throw;
        }
    }

    public async Task<bool> DeleteFileAsync(string objectKey)
    {
        try
        {
            var request = new DeleteObjectRequest
            {
                BucketName = _bucketName,
                Key = objectKey
            };

            await _s3Client.DeleteObjectAsync(request);

            _logger.LogInformation("File deleted from R2: {ObjectKey}", objectKey);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting file from R2: {ObjectKey}", objectKey);
            return false;
        }
    }

    public async Task<bool> FileExistsAsync(string objectKey)
    {
        try
        {
            var request = new GetObjectMetadataRequest
            {
                BucketName = _bucketName,
                Key = objectKey
            };

            await _s3Client.GetObjectMetadataAsync(request);
            return true;
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return false;
        }
    }

    public string GetPublicUrl(string objectKey)
    {
        if (string.IsNullOrEmpty(_publicUrl))
        {
            throw new InvalidOperationException("Public URL not configured");
        }

        return $"{_publicUrl.TrimEnd('/')}/{objectKey}";
    }
}
