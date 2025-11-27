"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { assemblyList } from "@/lib/constants";
import { permuteReplacements } from "@/lib/all-permutations";
import {
  Search,
  Users,
  FileText,
  Info,
  Loader2,
  MapPin,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MultiSelect } from "@/components/ui/multi-select";
import { Switch } from "@/components/ui/switch";

const formSchema = z.object({
  assembly: z
    .array(z.string())
    .min(1, { message: "Please select at least one assembly" }),
  name: z.string().min(1, { message: "Name is required" }),
  relativeName: z.string().min(1, { message: "Relative name is required" }),
});

type SearchResult = {
  assemblyNo: string;
  partNo: string;
  serialNo: string;
  houseNo: string;
  name: string;
  relation: string;
  relativeName: string;
  gender: string;
  epicNo: string;
  sectionName: string;
};

type SearchResponse = {
  data: SearchResult[];
  meta: {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    message: string;
  };
};

const Page = () => {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enablePermutations, setEnablePermutations] = useState(true);
  const [searchStats, setSearchStats] = useState<{
    total: number;
    completed: number;
    found: number;
  } | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      assembly: [],
      name: "",
      relativeName: "",
    },
  });

  const watchedName = form.watch("name");
  const watchedRelativeName = form.watch("relativeName");
  const watchedAssembly = form.watch("assembly");

  const totalEstimatedQueries = (() => {
    const assemblyCount = watchedAssembly?.length || 0;
    if (assemblyCount === 0) return 0;

    if (!enablePermutations) {
      return assemblyCount;
    }

    const nameCount = watchedName ? permuteReplacements(watchedName).length : 1;
    const relativeNameCount = watchedRelativeName
      ? permuteReplacements(watchedRelativeName).length
      : 1;

    return assemblyCount * nameCount * relativeNameCount;
  })();

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    setError(null);
    setResults(null);
    setSearchStats(null);

    try {
      const namePermutations = enablePermutations
        ? permuteReplacements(values.name)
        : [values.name];
      const relativeNamePermutations = enablePermutations
        ? permuteReplacements(values.relativeName)
        : [values.relativeName];

      const combinations: {
        assembly: string;
        name: string;
        relativeName: string;
      }[] = [];

      for (const assembly of values.assembly) {
        for (const name of namePermutations) {
          for (const relativeName of relativeNamePermutations) {
            combinations.push({ assembly, name, relativeName });
          }
        }
      }

      setSearchStats({ total: combinations.length, completed: 0, found: 0 });

      const promises = combinations.map(async (combo) => {
        const params = new URLSearchParams({
          assembly: combo.assembly,
          name: combo.name,
          relativeName: combo.relativeName,
        });

        try {
          const response = await fetch(
            `/api/search-electors?${params.toString()}`
          );

          if (!response.ok) {
            return;
          }

          const data = (await response.json()) as SearchResponse;

          if (data.data && data.data.length > 0) {
            setSearchStats((prev) =>
              prev ? { ...prev, found: prev.found + 1 } : null
            );
            setResults((prev) => {
              const currentData = prev?.data || [];
              const existing = new Set(
                currentData.map(
                  (d) => d.assemblyNo + "%" + d.partNo + "%" + d.serialNo
                )
              );
              const newItems = data.data.filter(
                (d) =>
                  !existing.has(
                    d.assemblyNo + "%" + d.partNo + "%" + d.serialNo
                  )
              );

              if (newItems.length === 0) return prev;

              const totalRecords = currentData.length + newItems.length;

              return {
                data: [...currentData, ...newItems],
                meta: {
                  currentPage: 1,
                  totalPages: 1,
                  totalRecords: totalRecords,
                  message: `Found ${totalRecords} records...`,
                },
              };
            });
          }
        } catch (e) {
          console.error(e);
        } finally {
          setSearchStats((prev) =>
            prev ? { ...prev, completed: prev.completed + 1 } : null
          );
        }
      });

      await Promise.all(promises);

      setResults((prev) => {
        if (!prev) {
          return {
            data: [],
            meta: {
              currentPage: 0,
              totalPages: 0,
              totalRecords: 0,
              message: "No records found.",
            },
          };
        }
        return {
          ...prev,
          meta: {
            ...prev.meta,
            message: `Finished. Found ${prev.data.length} records.`,
          },
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 border-b">
        <div className="container mx-auto p-5 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">
            Elector Search Portal
          </h1>
        </div>
      </div>

      <div className="container mx-auto py-10 px-4 max-w-5xl">
        <div className="grid gap-8">
          {/* Search Form */}
          <Card className="shadow-lg border-slate-200 dark:border-slate-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" />
                <CardTitle>Search Voter Details</CardTitle>
              </div>
              <CardDescription>
                Fill in the details below to find elector information. All
                fields are required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    <FormField
                      control={form.control}
                      name="assembly"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex gap-2">
                            <MapPin className="w-4 h-4" /> Assembly
                          </FormLabel>
                          <FormControl>
                            <MultiSelect
                              selected={field.value}
                              options={assemblyList.map((a) => ({
                                label: a,
                                value: a,
                              }))}
                              onChange={field.onChange}
                              placeholder="Select Assemblies"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex gap-2">
                            <User className="w-4 h-4" /> Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter elector's name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="relativeName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex gap-2">
                            <Users className="w-4 h-4" /> Relative Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Father/Husband's name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex flex-col space-y-1">
                      <FormLabel className="text-base">
                        Fuzzy Search (Permutations)
                      </FormLabel>
                      <FormDescription>
                        Enable to search for name variations (e.g., spelling
                        differences).
                        <br />
                        <span className="text-xs text-muted-foreground">
                          Current estimated queries:{" "}
                          <span className="font-mono font-medium text-primary">
                            {totalEstimatedQueries}
                          </span>
                        </span>
                      </FormDescription>
                    </div>
                    <Switch
                      checked={enablePermutations}
                      onCheckedChange={setEnablePermutations}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={loading}
                      size="lg"
                      className="w-full md:w-auto"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Search Records
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="p-4 border border-red-200 bg-red-50 text-red-900 rounded-lg flex items-center gap-3">
              <Info className="w-5 h-5 text-red-600" />
              <p>{error}</p>
            </div>
          )}

          {/* Search Stats */}
          {searchStats && (
            <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-muted-foreground bg-slate-100 dark:bg-slate-800/50 p-3 rounded-md border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Loader2
                  className={`w-4 h-4 ${
                    loading ? "animate-spin text-primary" : "text-green-500"
                  }`}
                />
                <span>
                  {loading ? "Searching permutations:" : "Search completed:"}{" "}
                  <span className="font-medium text-foreground">
                    {searchStats.completed}
                  </span>{" "}
                  / {searchStats.total}
                </span>
              </div>
              <div className="mt-1 sm:mt-0">
                Matches found in:{" "}
                <span className="font-medium text-foreground">
                  {searchStats.found}
                </span>{" "}
                permutations
              </div>
            </div>
          )}

          {/* Results Section */}
          {results && (
            <Card className="shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500 pb-0 gap-0">
              <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" />
                      Search Results
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {results.meta.message}
                    </p>
                  </div>
                  <div className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
                    {results.data.length} Records
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {results.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900">
                          <TableHead className="font-semibold">
                            Assembly No
                          </TableHead>
                          <TableHead className="font-semibold">
                            Part No
                          </TableHead>
                          <TableHead className="font-semibold">
                            Serial No
                          </TableHead>
                          <TableHead className="font-semibold">Name</TableHead>
                          <TableHead className="font-semibold">
                            Relative Name
                          </TableHead>
                          <TableHead className="font-semibold">
                            Relation
                          </TableHead>
                          <TableHead className="font-semibold">
                            Gender/Age
                          </TableHead>
                          <TableHead className="font-semibold">
                            EPIC No
                          </TableHead>
                          <TableHead className="font-semibold">
                            Section
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.data.map((row, index) => (
                          <TableRow
                            key={`${row.epicNo}-${index}`}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          >
                            <TableCell>{row.assemblyNo}</TableCell>
                            <TableCell>{row.partNo}</TableCell>
                            <TableCell>{row.serialNo}</TableCell>
                            <TableCell>{row.name}</TableCell>
                            <TableCell>{row.relativeName}</TableCell>
                            <TableCell>{row.relation}</TableCell>
                            <TableCell>{row.gender}</TableCell>
                            <TableCell>
                              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs">
                                {row.epicNo.trim() === "" ? "N/A" : row.epicNo}
                              </span>
                            </TableCell>
                            <TableCell
                              className="max-w-[200px] truncate"
                              title={row.sectionName}
                            >
                              {row.sectionName}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <Search className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium">No records found</p>
                    <p className="text-sm max-w-xs mx-auto mt-2">
                      Try adjusting your search terms or checking the spelling
                      of the names.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Help/Info Section */}
          {!results && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              <Card className="bg-blue-50/50 border-blue-100 dark:bg-blue-950/10 dark:border-blue-900">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <Info className="w-4 h-4" /> How it works
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-blue-900/80 dark:text-blue-200/80">
                  This tool searches through the electoral roll database for the
                  selected assembly. It uses fuzzy matching to help find names
                  even with slight spelling variations.
                </CardContent>
              </Card>

              <Card className="bg-green-50/50 border-green-100 dark:bg-green-950/10 dark:border-green-900">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                    <Users className="w-4 h-4" /> Who is this for?
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-green-900/80 dark:text-green-200/80">
                  Designed for Booth Level Officers (BLOs) and citizens to
                  quickly verify voter details and locate their polling station
                  information.
                </CardContent>
              </Card>

              <Card className="bg-amber-50/50 border-amber-100 dark:bg-amber-950/10 dark:border-amber-900">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <FileText className="w-4 h-4" /> Data Source
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-amber-900/80 dark:text-amber-200/80">
                  Data is sourced from the latest available electoral rolls.
                  Please verify with official ECI documents for official
                  purposes.
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Footer Warning */}
      <footer className="bg-slate-100 dark:bg-slate-900 border-t py-6 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-amber-600 dark:text-amber-500">
              Disclaimer:
            </span>{" "}
            This application is not officially affiliated with any government
            body. It is a tool designed to assist Booth Level Officers (BLOs)
            and voters in locating their records within the latest SIR (Special
            Summary Revision) data.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Page;
