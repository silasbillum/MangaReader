using MangaReader.DomainModels;
namespace MangaReader.Service
{
    public class MangaService
    {
        private readonly HttpClient _httpClient;

        public MangaService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<List<Manga>> GetMangaListAsync(int page = 1)
        {
            var url = $"https://mangareader-3.onrender.com/api/mangaList?type=hot-manga&page={page}";
            var result = await _httpClient.GetFromJsonAsync<MangaListResponse>(url);
            return result?.MangaList ?? new List<Manga>();
        }

        public async Task<MangaDetail> GetMangaDetailAsync(string id)
        {
            var url = $"https://mangareader-3.onrender.com/api/manga/{id}";
            return await _httpClient.GetFromJsonAsync<MangaDetail>(url);
        }

    }
}
