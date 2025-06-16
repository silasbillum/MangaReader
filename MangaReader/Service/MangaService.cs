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
            //https://mangareader-c0th.onrender.com/api/mangaList?type=hot-manga&page={page}
            var url = $"http://localhost:3000/api/mangaList?type=hot-manga&page={page}";
            var result = await _httpClient.GetFromJsonAsync<MangaListResponse>(url);
            return result?.MangaList ?? new List<Manga>();
        }

    }
}
