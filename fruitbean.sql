--
-- PostgreSQL database dump
--

\restrict 7YtQ71EYWoGaSbf7NaVxNkywEhewFvPCquo5urTW2rtg44o39gFL47geFrJSHBm

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    client_id integer NOT NULL,
    company_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    company_number character varying(20),
    company_address text,
    account_status boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    account_type character varying(20),
    reset_token_hash text,
    reset_token_expires timestamp without time zone,
    CONSTRAINT clients_account_type_check CHECK (((account_type)::text = ANY (ARRAY[('admin'::character varying)::text, ('client'::character varying)::text])))
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- Name: clients_client_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clients_client_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clients_client_id_seq OWNER TO postgres;

--
-- Name: clients_client_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clients_client_id_seq OWNED BY public.clients.client_id;


--
-- Name: inquiries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inquiries (
    inquiry_id integer NOT NULL,
    company_name character varying(255) NOT NULL,
    contact_number character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    purposes text[] NOT NULL,
    usage_level character varying(20) NOT NULL,
    printer_count integer NOT NULL,
    rental_years integer NOT NULL,
    selected_printers jsonb NOT NULL,
    total_monthly numeric(10,2) NOT NULL,
    total_yearly numeric(10,2) NOT NULL,
    total_contract numeric(10,2) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    client_id integer,
    company_address text
);


ALTER TABLE public.inquiries OWNER TO postgres;

--
-- Name: inquiries_inquiry_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inquiries_inquiry_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inquiries_inquiry_id_seq OWNER TO postgres;

--
-- Name: inquiries_inquiry_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inquiries_inquiry_id_seq OWNED BY public.inquiries.inquiry_id;


--
-- Name: printers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.printers (
    printer_id integer NOT NULL,
    printer_model character varying(100) NOT NULL,
    rate_per_month numeric(10,2) NOT NULL,
    description text,
    available boolean DEFAULT true
);


ALTER TABLE public.printers OWNER TO postgres;

--
-- Name: printers_printer_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.printers_printer_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.printers_printer_id_seq OWNER TO postgres;

--
-- Name: printers_printer_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.printers_printer_id_seq OWNED BY public.printers.printer_id;


--
-- Name: rentals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rentals (
    rental_id integer NOT NULL,
    client_id integer,
    printer_id integer,
    start_date date NOT NULL,
    end_date date,
    status character varying(20) DEFAULT 'Pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    problem_types jsonb,
    urgency character varying(20),
    problem_notes text,
    reported_at timestamp without time zone,
    resolution_method character varying(20),
    technician character varying(50),
    resolved_at timestamp without time zone,
    confirmed_at timestamp without time zone,
    problem_image_url text,
    assigned_technician character varying(50),
    arrival_date date,
    assignment_note text,
    assigned_at timestamp without time zone,
    contract_start date,
    contract_end date,
    contract_status character varying(20),
    last_notified_at timestamp without time zone,
    CONSTRAINT rentals_contract_status_check CHECK (((contract_status IS NULL) OR ((contract_status)::text = ANY ((ARRAY['Active'::character varying, 'Expiring'::character varying, 'Expired'::character varying])::text[])))),
    CONSTRAINT rentals_status_check CHECK (((status)::text = ANY (ARRAY[('Active'::character varying)::text, ('Pending'::character varying)::text, ('Problem'::character varying)::text, ('Resolved'::character varying)::text, ('Ended'::character varying)::text])))
);


ALTER TABLE public.rentals OWNER TO postgres;

--
-- Name: rentals_rental_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rentals_rental_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rentals_rental_id_seq OWNER TO postgres;

--
-- Name: rentals_rental_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rentals_rental_id_seq OWNED BY public.rentals.rental_id;


--
-- Name: clients client_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients ALTER COLUMN client_id SET DEFAULT nextval('public.clients_client_id_seq'::regclass);


--
-- Name: inquiries inquiry_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inquiries ALTER COLUMN inquiry_id SET DEFAULT nextval('public.inquiries_inquiry_id_seq'::regclass);


--
-- Name: printers printer_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printers ALTER COLUMN printer_id SET DEFAULT nextval('public.printers_printer_id_seq'::regclass);


--
-- Name: rentals rental_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rentals ALTER COLUMN rental_id SET DEFAULT nextval('public.rentals_rental_id_seq'::regclass);


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clients (client_id, company_name, email, password, company_number, company_address, account_status, created_at, account_type, reset_token_hash, reset_token_expires) FROM stdin;
2	BGC	cleint@gmail.com	12345	09473909569	deano street taguig city	t	2026-06-12 19:28:32.843376	client	\N	\N
3	Merville Company	karloyara@gmail.com	$2b$10$OqV1BFWvSmhRI5gt3J/leOZ1wZDUimd42OqlZKeMMPZ7gI8dT7xtm	09165730269	\N	t	2026-07-17 15:12:00.275166	client	\N	\N
5	Merville Company	walakangmata@gmail.com	$2b$10$U.oBtd/CPVqKDilpEIrhZu3CS78/jFTGBTKLroCAq3DsIm2eJ2wpO	09165730269	\N	t	2026-07-17 15:39:54.181792	client	\N	\N
6	Test Co	test@example.com	$2b$10$yQaeYJ.T6pD4KIx8oVnuVelf.wtqAsJF8oLLDYPGKBFOo0I7Zo5Yy	09171234567	\N	t	2026-07-18 16:42:56.620111	client	\N	\N
7	wigon company	alipyolegend@gmail.com	$2b$10$tvC8IC39bx41ufKDKDjF9et1HxLuelnbbd1ojE1FPv0x/40zVoXs6	09156237246	\N	t	2026-07-18 17:07:12.682102	client	\N	\N
8	Fruitbean Admin	admin@fruitbean.local	$2b$10$wwBNJUypx7l0rRgXdFh6seLzxNdG9CxFFqqFX5K7HSwL1MEuFVHFi	0000000000	Fruitbean HQ	t	2026-07-18 20:36:19.999637	admin	\N	\N
9	Sheldon Company	alipyomaster@gmail.com	$2b$10$AZJiYXU2FyA6N//Yqcy1A.kOCRmdoRY8BhgbKyNYYVfCqPAeaTyne	09157435467	\N	t	2026-07-18 20:53:29.939155	client	\N	\N
16	furry company	zoomsbi@gmail.com	$2b$10$oVxMFMHQCMaLT7D7LikU/umbeZ1.p/LvgFHhn/73pAn22iNcaVrVq	09300232967	furry land, folk valley	t	2026-07-23 13:06:23.978723	client	622d56b81df93c5c126ae342b07fb785f9261a97ba6f60b36c2214824d8dfb38	2026-07-23 14:40:14.754
17	Rose	lefrixjohnlegends@gmail.com	$2b$10$8noQZlXlvS2yyNaTPZAspetkfVucHYdolXp6bediBvxbShI7ZKToW	09300232933	Shop	t	2026-07-23 19:51:14.580123	admin	\N	\N
\.


--
-- Data for Name: inquiries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inquiries (inquiry_id, company_name, contact_number, email, purposes, usage_level, printer_count, rental_years, selected_printers, total_monthly, total_yearly, total_contract, status, created_at, client_id, company_address) FROM stdin;
1	Argon Company	09473909569	karloyara@gmail.com	{"Reports and plans","Marketing materials"}	Heavy	2	2	[{"rate": 4500, "model": "Epson C5790", "quantity": 2, "subtotal": 9000}]	9000.00	108000.00	216000.00	pending	2026-07-11 13:57:36.767818	\N	\N
2	Argon Company	09473909569	karloyara@gmail.com	{"Reports and plans","Marketing materials"}	Heavy	2	2	[{"rate": 1200, "model": "Epson L15150", "quantity": 2, "subtotal": 2400}]	2400.00	28800.00	57600.00	pending	2026-07-11 19:38:54.549414	\N	\N
3	Amogus Company	09165730269	karloyara@gmail.com	{Marketing}	Heavy	2	3	[{"rate": 4500, "model": "Epson C5790", "quantity": 2, "subtotal": 9000}]	9000.00	108000.00	324000.00	pending	2026-07-13 20:35:56.906144	\N	\N
4	Merville Company	09165730269	karloyara@gmail.com	{"Reports and marketing"}	Heavy	2	4	[{"rate": 4500, "model": "Epson C5790", "quantity": 2, "subtotal": 9000}]	9000.00	108000.00	432000.00	converted	2026-07-17 15:11:59.785722	3	\N
5	Merville Company	09165730269	karloyara@gmail.com	{Reports,Marketing}	Heavy	2	4	[{"rate": 4500, "model": "Epson C5790", "quantity": 2, "subtotal": 9000}]	9000.00	108000.00	432000.00	pending	2026-07-17 15:29:55.306081	\N	\N
6	Merville Company	09165730269	walakangmata@gmail.com	{reports,marketing}	Heavy	2	4	[{"rate": 4500, "model": "Epson C5790", "quantity": 2, "subtotal": 9000}]	9000.00	108000.00	432000.00	converted	2026-07-17 15:39:53.452294	5	\N
7	Test Co	09171234567	test@example.com	{testing}	Light	1	1	[{"rate": 1400, "model": "Epson L120", "quantity": 1, "subtotal": 1400}]	1400.00	16800.00	16800.00	converted	2026-07-18 16:42:56.483502	6	\N
8	wigon company	09156237246	alipyolegend@gmail.com	{"marketing and reports"}	Heavy	3	5	[{"rate": 3000, "model": "Epson L5590", "quantity": 2, "subtotal": 6000}, {"rate": 2000, "model": "Epson L3250", "quantity": 1, "subtotal": 2000}]	8000.00	96000.00	480000.00	converted	2026-07-18 17:07:12.547191	7	\N
9	Sheldon Company	09157435467	alipyomaster@gmail.com	{reports,marketing}	Heavy	17	4	[{"rate": 3000, "model": "Epson L5590", "quantity": 10, "subtotal": 30000}, {"rate": 2000, "model": "Epson L565", "quantity": 4, "subtotal": 8000}, {"rate": 1400, "model": "Epson L360", "quantity": 3, "subtotal": 4200}]	42200.00	506400.00	2025600.00	converted	2026-07-18 20:53:29.788961	9	\N
10	Sheldon Company	09157435467	alipyomaster@gmail.com	{reports,marketing}	Heavy	17	4	[{"rate": 3000, "model": "Epson L5590", "quantity": 10, "subtotal": 30000}, {"rate": 2000, "model": "Epson L565", "quantity": 4, "subtotal": 8000}, {"rate": 1400, "model": "Epson L360", "quantity": 3, "subtotal": 4200}]	42200.00	506400.00	2025600.00	pending	2026-07-18 21:00:07.209072	\N	\N
11	Bigbang Company	09871236574	walakangmata@gmail.com	{"marketing and reports"}	Heavy	5	3	[{"rate": 5500, "model": "Epson C5890", "quantity": 2, "subtotal": 11000}, {"rate": 3000, "model": "Epson L5590", "quantity": 3, "subtotal": 9000}]	20000.00	240000.00	720000.00	converted	2026-07-18 21:14:46.655853	5	\N
12	Bigbang Company	09871236574	walakangmata@gmail.com	{"marketing and reports"}	Heavy	5	3	[{"rate": 5500, "model": "Epson C5890", "quantity": 2, "subtotal": 11000}, {"rate": 3000, "model": "Epson L5590", "quantity": 3, "subtotal": 9000}]	20000.00	240000.00	720000.00	converted	2026-07-18 21:15:27.828539	5	\N
18	furry company	09300232967	zoomsbi@gmail.com	{"printing furries"}	Light	1	1	[{"rate": 3000, "model": "Epson L5590", "quantity": 1, "subtotal": 3000}]	3000.00	36000.00	36000.00	converted	2026-07-23 13:06:23.858329	16	furry land, folk valley
\.


--
-- Data for Name: printers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.printers (printer_id, printer_model, rate_per_month, description, available) FROM stdin;
2	Epson L121	1500.00	Basic single-function, home/small office	t
3	Epson L130	1800.00	Simple color document printing	t
4	Epson L360	1400.00	All-in-one, moderate use	t
5	Epson LX-310	350.00	Dot matrix, receipts/invoices/multi-part forms	t
6	Epson L3110	1500.00	Budget all-in-one	t
7	Epson L3156	2000.00	Wireless all-in-one, home office	t
8	Epson L3210	1700.00	Daily office workloads	t
9	Epson L3250	2000.00	Wireless, flexible setup	t
10	Epson L565	2000.00	Print/scan/copy/fax	t
11	Epson L5290	2500.00	Business, wireless, fax, networking	t
12	Epson L5590	3000.00	Growing business, ADF, networking	t
13	Epson M3170	3000.00	High-speed mono only	t
14	Epson L6370	4000.00	Large offices, auto duplex, high output	t
15	Epson L6460	4000.00	Busy offices, high-speed/volume	t
16	Epson C5790	4500.00	Professional color, shared offices	t
17	Epson L14150	4500.00	A3+ prints, plans/drawings/marketing	t
18	Epson C5890	5500.00	Corporate/edu, high-volume color	t
19	Epson L6550	1000.00	Enterprise, large workgroups	t
20	Epson L15150	1200.00	High-volume A3 multifunction	t
21	Brother MFC T4500 DW	4500.00	A3 print/scan/copy/fax, large-format docs	t
1	Epson L120	1400.00	The Best Printer	t
\.


--
-- Data for Name: rentals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rentals (rental_id, client_id, printer_id, start_date, end_date, status, created_at, problem_types, urgency, problem_notes, reported_at, resolution_method, technician, resolved_at, confirmed_at, problem_image_url, assigned_technician, arrival_date, assignment_note, assigned_at, contract_start, contract_end, contract_status, last_notified_at) FROM stdin;
1	2	1	2026-01-10	2026-07-10	Pending	2026-01-10 00:00:00	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
2	3	16	2026-07-17	2030-07-17	Pending	2026-07-17 15:12:00.275166	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
3	3	16	2026-07-17	2030-07-17	Pending	2026-07-17 15:12:00.275166	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
6	6	1	2026-07-18	2027-07-18	Pending	2026-07-18 16:42:56.620111	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
7	7	12	2026-07-18	2031-07-18	Pending	2026-07-18 17:07:12.682102	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
8	7	12	2026-07-18	2031-07-18	Pending	2026-07-18 17:07:12.682102	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
9	7	9	2026-07-18	2031-07-18	Pending	2026-07-18 17:07:12.682102	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
10	9	12	2026-07-18	2030-07-18	Pending	2026-07-18 20:53:29.939155	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
11	9	12	2026-07-18	2030-07-18	Pending	2026-07-18 20:53:29.939155	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
12	9	12	2026-07-18	2030-07-18	Pending	2026-07-18 20:53:29.939155	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
13	9	12	2026-07-18	2030-07-18	Pending	2026-07-18 20:53:29.939155	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
14	9	12	2026-07-18	2030-07-18	Pending	2026-07-18 20:53:29.939155	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
15	9	12	2026-07-18	2030-07-18	Pending	2026-07-18 20:53:29.939155	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
16	9	12	2026-07-18	2030-07-18	Pending	2026-07-18 20:53:29.939155	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
17	9	12	2026-07-18	2030-07-18	Pending	2026-07-18 20:53:29.939155	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
18	9	12	2026-07-18	2030-07-18	Pending	2026-07-18 20:53:29.939155	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
19	9	12	2026-07-18	2030-07-18	Pending	2026-07-18 20:53:29.939155	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
20	9	10	2026-07-18	2030-07-18	Pending	2026-07-18 20:53:29.939155	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
21	9	10	2026-07-18	2030-07-18	Pending	2026-07-18 20:53:29.939155	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
22	9	10	2026-07-18	2030-07-18	Pending	2026-07-18 20:53:29.939155	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
23	9	10	2026-07-18	2030-07-18	Pending	2026-07-18 20:53:29.939155	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
24	9	4	2026-07-18	2030-07-18	Pending	2026-07-18 20:53:29.939155	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
25	9	4	2026-07-18	2030-07-18	Pending	2026-07-18 20:53:29.939155	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
26	9	4	2026-07-18	2030-07-18	Pending	2026-07-18 20:53:29.939155	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
4	5	16	2026-07-17	2030-07-17	Problem	2026-07-17 15:39:54.181792	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
27	5	12	2026-07-20	2028-07-20	Active	2026-07-20 13:37:24.692705	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
5	5	16	2026-07-17	2030-07-17	Problem	2026-07-17 15:39:54.181792	["paper_jam"]	high	maingay yung printer	2026-07-20 13:37:08.742637	\N	\N	\N	\N	\N	OJT Gang	2026-07-21	Pakiready po yung working permit para dire-diretso po ang technician namin	2026-07-20 13:39:17.710239	\N	\N	\N	\N
33	16	12	2026-07-23	2027-07-23	Active	2026-07-23 13:06:23.978723	["bad_printout", "low_ink", "paper_jam"]	high	\N	2026-07-23 19:38:40.091945	technician	OJT Gang	2026-07-23 19:39:28.51931	2026-07-23 19:52:54.922065	\N	OJT Gang	2026-07-23	\N	2026-07-23 19:38:56.271682	\N	\N	\N	\N
\.


--
-- Name: clients_client_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clients_client_id_seq', 17, true);


--
-- Name: inquiries_inquiry_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inquiries_inquiry_id_seq', 18, true);


--
-- Name: printers_printer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.printers_printer_id_seq', 21, true);


--
-- Name: rentals_rental_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rentals_rental_id_seq', 33, true);


--
-- Name: clients clients_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_email_key UNIQUE (email);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (client_id);


--
-- Name: inquiries inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_pkey PRIMARY KEY (inquiry_id);


--
-- Name: printers printers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printers
    ADD CONSTRAINT printers_pkey PRIMARY KEY (printer_id);


--
-- Name: rentals rentals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_pkey PRIMARY KEY (rental_id);


--
-- Name: inquiries inquiries_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(client_id);


--
-- Name: rentals rentals_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(client_id) ON DELETE CASCADE;


--
-- Name: rentals rentals_printer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_printer_id_fkey FOREIGN KEY (printer_id) REFERENCES public.printers(printer_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 7YtQ71EYWoGaSbf7NaVxNkywEhewFvPCquo5urTW2rtg44o39gFL47geFrJSHBm

