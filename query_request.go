package main

import (
	"bytes"
	"encoding/xml"
	"errors"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type queryRequest struct {
	Username string
	Password string
	Tenant   string
	Sample   bool
	Query    string
}

func validateQueryRequest(values url.Values) (qr queryRequest, e error) {
	var errs []string

	if qr.Username = values.Get("username"); qr.Username == "" {
		errs = append(errs, "username")
	}

	if qr.Password = values.Get("password"); qr.Password == "" {
		errs = append(errs, "password")
	}

	if qr.Tenant = values.Get("tenant"); qr.Tenant == "" {
		errs = append(errs, "tenant")
	}

	if sample := values.Get("sample"); sample != "" {
		qr.Sample = sample == "true"
	} else {
		errs = append(errs, "tenant")
	}

	if qr.Query = values.Get("query"); qr.Query == "" {
		errs = append(errs, "query")
	}

	if len(errs) > 0 {
		e = errors.New(strings.Join(errs, ", "))
	}

	return qr, e
}

func processQuery(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	r.ParseForm()
	data, err := validateQueryRequest(r.Form)
	if err != nil {
		errMsg := fmt.Sprintf("Invalid request values: %s", err)
		log.Println(errMsg)
		errorResponse(w, errMsg, 422)
		return
	}

	fmt.Println(data)
	respBody := getResponseBody(data)
	start := time.Now()
	resp, err := http.Post("https://us1.eam.hxgnsmartcloud.com/axis/services/EWSConnector", "text/xml", bytes.NewBuffer([]byte(respBody)))
	diff := time.Since(start)
	fmt.Printf("Request time: %dms\n", diff.Milliseconds())

	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	defer resp.Body.Close()

	d := xml.NewDecoder(resp.Body)

	start = time.Now()
	var responseData [][]string
	var responseError error
	for {
		tok, err := d.Token()
		if tok == nil || err == io.EOF {
			break
		} else if err != nil {
			fmt.Printf("Error decoding token: %s", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		var decodeError error
		switch ty := tok.(type) {
		case xml.StartElement:
			switch ty.Name.Local {
			case "R":
				var row struct {
					C []string
				}

				decodeError = d.DecodeElement(&row, &ty)
				responseData = append(responseData, row.C)
			case "Metadata":
				var metadata struct {
					Columns []struct {
						Label string `xml:"label,attr"`
					} `xml:"Column"`
				}
				decodeError = d.DecodeElement(&metadata, &ty)

				var headers []string
				for _, col := range metadata.Columns {
					headers = append(headers, col.Label)
				}

				responseData = append(responseData, headers)
			case "faultstring":
				var fault string
				decodeError = d.DecodeElement(&fault, &ty)
				responseError = errors.New(fault)
				break
			}
		}

		if decodeError != nil {
			fmt.Printf("Error decoding element: %s", decodeError)
			http.Error(w, decodeError.Error(), http.StatusInternalServerError)
			return
		}
	}
	diff = time.Since(start)
	fmt.Printf("Parse time: %dms\n", diff.Milliseconds())

	if responseError != nil {
		fmt.Printf("Response Error: %s", responseError)
		http.Error(w, responseError.Error(), http.StatusInternalServerError)
		return
	}

	start = time.Now()
	t, _ := template.ParseFiles("views/query_data.html")
	if err = t.Execute(w, responseData); err != nil {
		fmt.Printf("Error decoding element: %s", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	diff = time.Since(start)
	fmt.Printf("Response Template Parse Time: %dms\n", diff.Milliseconds())

	// if err = json.NewEncoder(w).Encode(responseData); err != nil {
	// 	fmt.Printf("Error decoding element: %s", err)
	// 	http.Error(w, err.Error(), http.StatusInternalServerError)
	// 	return
	// }

	w.WriteHeader(http.StatusOK)
}

func getResponseBody(data queryRequest) string {
	query := strings.Replace(data.Query, "<", "&lt;", -1)

	if data.Sample {
		query = fmt.Sprintf("SELECT * FROM (%s) WHERE ROWNUM &lt;= 50", query)
	}

	return fmt.Sprintf(`<Envelope xmlns="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<Header>
		<Security xmlns="http://schemas.xmlsoap.org/ws/2002/04/secext">
			<UsernameToken>
				<Username>%s@%s</Username>
				<Password>%s</Password>
			</UsernameToken>
		</Security>
		<SessionScenario xmlns="http://schemas.datastream.net/headers">terminate</SessionScenario>
		<Organization xmlns="http://schemas.datastream.net/headers">GSO</Organization>
	</Header>
	<Body>
		<MP0170_GetDatabaseData_001 verb="Get" noun="DatabaseData" version="001" xmlns="http://schemas.datastream.net/MP_functions/MP0170_001">
			<SelectStatement returnmetadata="true">
				%s
			</SelectStatement>
		</MP0170_GetDatabaseData_001>
	</Body>
</Envelope>`, data.Username, data.Tenant, data.Password, query)
}
