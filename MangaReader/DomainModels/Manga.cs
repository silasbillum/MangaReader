namespace MangaReader.DomainModels
{
    public class Manga
    {
        public string title { get; set; }
        public string thumb { get; set; }
        public string chapter { get; set; }
        public string view { get; set; }
        public string description { get; set; }
    }

    public class MangaDetail
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string CoverImage { get; set; }
        public string Description { get; set; }
        public List<string> Authors { get; set; }
        public string Status { get; set; }
        public List<string> Genres { get; set; }
        public List<Chapter> Chapters { get; set; }
    }

    public class Chapter
    {
        public string Title { get; set; }
        public string Url { get; set; }
    }

}
