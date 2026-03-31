namespace BigBoss.Core.Interfaces;

public interface ICloudflareService
{
    Task<string> GetSignedUrlAsync(string objectKey, int expirySeconds = 1800);
    Task<string> UploadFileAsync(Stream fileStream, string objectKey, string contentType);
    Task<bool> DeleteFileAsync(string objectKey);
    Task<bool> FileExistsAsync(string objectKey);
    string GetPublicUrl(string objectKey);
}
