create policy folder_anon_all
    on folders
    for all
    to anon
    using (true)
    with check (true);

create policy cards_anon_all
    on cards
    for all
    to anon
    using (true)
    with check (true)